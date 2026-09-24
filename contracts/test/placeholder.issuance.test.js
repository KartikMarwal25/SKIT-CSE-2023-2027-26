// SPDX-License-Identifier: MIT
// describe/it are Hardhat's injected Mocha globals — no require needed (and
// requiring the `mocha` package directly here breaks them).
const { expect } = require('chai');
const { ethers } = require('hardhat');

/**
 * Week 7 finding, from running this suite end-to-end against a real Ganache
 * instance (`npx hardhat test --network ganache`) instead of Hardhat's own
 * network: every `revertedWithCustomError` assertion in "3. Access control"
 * failed there, even though the underlying contract behaviour is correct.
 *
 * Root cause: those assertions called the state-changing method directly
 * (e.g. `registry.connect(stranger).issueCertificate(...)`), which goes
 * through `eth_estimateGas` before sending. Ganache's `eth_estimateGas`
 * error on a revert doesn't carry the ABI-encoded revert data the way
 * Hardhat's own network's does, so chai-matchers has nothing to decode the
 * specific custom error from — it fails with a generic ProviderError
 * instead of matching NotIssuer/NotOwner/ZeroAddress.
 *
 * Fix: call `.staticCall(...)` on the method for every assertion that
 * expects a revert. `.staticCall` goes through `eth_call`, not
 * `eth_estimateGas` — Ganache's `eth_call` DOES return proper revert data,
 * so the same assertion now decodes correctly on both networks. Verified
 * with both `npx hardhat test` (default network) and
 * `npx hardhat test --network ganache` — all pass on both.
 */
describe('Certificate issuance', () => {
  async function deployFixture() {
    const [owner, issuer, stranger] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory('SecureCredRegistry');
    const registry = await Registry.deploy();
    await registry.connect(owner).registerIssuer(issuer.address);
    return { registry, owner, issuer, stranger };
  }

  function hashOf(label) {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
  }

  const CID = 'bafybeigdyrztest1234567890abcdefghijklmnopqrstuvwxyz';

  describe('1. Valid issuance', () => {
    it('issueCertificate(hash, cid) from a registered issuer does not revert', async () => {
      const { registry, issuer } = await deployFixture();
      await expect(registry.connect(issuer).issueCertificate(hashOf('cert-1'), CID)).to.not.be.reverted;
    });

    it('certificates(hash) reflects certificateHash/ipfsCid/issuer/issuedAt after issuance', async () => {
      const { registry, issuer } = await deployFixture();
      const certHash = hashOf('cert-2');

      const tx = await registry.connect(issuer).issueCertificate(certHash, CID);
      const block = await ethers.provider.getBlock(tx.blockNumber);

      const stored = await registry.certificates(certHash);
      expect(stored.certificateHash).to.equal(certHash);
      expect(stored.ipfsCid).to.equal(CID);
      expect(stored.issuer).to.equal(issuer.address);
      expect(stored.issuedAt).to.equal(BigInt(block.timestamp));
    });

    it('certificates(hash).status starts at PENDING_STORAGE (enum index 0)', async () => {
      const { registry, issuer } = await deployFixture();
      const certHash = hashOf('cert-3');

      await registry.connect(issuer).issueCertificate(certHash, CID);

      const stored = await registry.certificates(certHash);
      expect(stored.status).to.equal(0n);
    });

    it('issuance emits CertificateIssued with the correct args', async () => {
      const { registry, issuer } = await deployFixture();
      const certHash = hashOf('cert-4');

      const tx = await registry.connect(issuer).issueCertificate(certHash, CID);
      const block = await ethers.provider.getBlock(tx.blockNumber);

      await expect(tx)
        .to.emit(registry, 'CertificateIssued')
        .withArgs(certHash, issuer.address, CID, block.timestamp);
    });
  });

  describe('2. Duplicate prevention', () => {
    it.skip('TODO: issuing the same certificateHash twice reverts with CertificateAlreadyExists', () => {});
    it.skip('TODO: issuing two different hashes from the same caller succeeds independently', () => {});
  });

  describe('3. Access control', () => {
    it('a non-issuer calling issueCertificate reverts with NotIssuer', async () => {
      const { registry, stranger } = await deployFixture();
      await expect(registry.connect(stranger).issueCertificate.staticCall(hashOf('cert-5'), CID))
        .to.be.revertedWithCustomError(registry, 'NotIssuer')
        .withArgs(stranger.address);
    });

    it('the owner itself cannot issue unless separately registered as an issuer', async () => {
      const { registry, owner } = await deployFixture();
      expect(await registry.isIssuer(owner.address)).to.equal(false);
      await expect(registry.connect(owner).issueCertificate.staticCall(hashOf('cert-6'), CID))
        .to.be.revertedWithCustomError(registry, 'NotIssuer')
        .withArgs(owner.address);
    });

    it('a non-owner calling registerIssuer reverts with NotOwner', async () => {
      const { registry, stranger } = await deployFixture();
      await expect(
        registry.connect(stranger).registerIssuer.staticCall(stranger.address),
      ).to.be.revertedWithCustomError(registry, 'NotOwner');
    });

    it('registerIssuer(address(0)) reverts with ZeroAddress', async () => {
      const { registry, owner } = await deployFixture();
      await expect(
        registry.connect(owner).registerIssuer.staticCall(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(registry, 'ZeroAddress');
    });

    it('after deregisterIssuer, that address can no longer issue', async () => {
      const { registry, owner, issuer } = await deployFixture();
      await registry.connect(owner).deregisterIssuer(issuer.address);
      await expect(registry.connect(issuer).issueCertificate.staticCall(hashOf('cert-7'), CID))
        .to.be.revertedWithCustomError(registry, 'NotIssuer')
        .withArgs(issuer.address);
    });
  });

  describe('4. Edge cases — malformed input', () => {
    it('accepts an empty ipfsCid today — known gap, not a bug to report', async () => {
      // The contract has no EmptyCid check yet, unlike the eventual mature
      // design. Documenting the current (permissive) behaviour rather than
      // asserting a revert that doesn't exist, so this test doesn't lie
      // about what Week 6 actually does.
      const { registry, issuer } = await deployFixture();
      await expect(registry.connect(issuer).issueCertificate(hashOf('cert-8'), '')).to.not.be.reverted;
      const stored = await registry.certificates(hashOf('cert-8'));
      expect(stored.ipfsCid).to.equal('');
    });

    it('accepts a very long ipfsCid without reverting', async () => {
      const { registry, issuer } = await deployFixture();
      const longCid = 'b'.repeat(2000);
      await expect(registry.connect(issuer).issueCertificate(hashOf('cert-9'), longCid)).to.not.be.reverted;
    });
  });

  describe('5. Edge cases — gas', () => {
    it('a single issuance stays well under the block gas limit', async () => {
      const { registry, issuer } = await deployFixture();
      const tx = await registry.connect(issuer).issueCertificate(hashOf('cert-10'), CID);
      const receipt = await tx.wait();
      // Generous ceiling — this is a smoke check against a runaway storage
      // bug, not a tuned gas budget (that's Week 8's gas-profiling task).
      expect(receipt.gasUsed).to.be.lessThan(200_000n);
    });
  });

  describe('6. Edge cases — re-entrancy', () => {
    it.skip(
      'TODO: no external calls happen inside issueCertificate, so there is no re-entrancy ' +
        'surface to test yet — revisit once a cross-contract call is introduced',
      () => {},
    );
  });
});
