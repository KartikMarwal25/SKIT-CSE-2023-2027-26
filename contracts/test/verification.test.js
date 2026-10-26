// SPDX-License-Identifier: MIT
// describe/it are Hardhat's injected Mocha globals — no require needed.
const { expect } = require('chai');
const { ethers } = require('hardhat');

/**
 * Dedicated coverage for verifyCertificate() (Week 9) and revokeCertificate()
 * (Week 10) — neither had its own tests until now, since placeholder.
 * issuance.test.js only ever covered issueCertificate(). Verified against
 * both `npx hardhat test` and `npx hardhat test --network ganache` — revert
 * assertions use `.staticCall` (see Week 7's finding: Ganache's
 * eth_estimateGas doesn't return decodable revert data the way Hardhat's
 * own network's does).
 */
describe('Verification and revocation', () => {
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
  const OUTCOME = { VERIFIED: 0n, REVOKED: 1n, TAMPERED: 2n, NOT_FOUND: 3n };

  describe('verifyCertificate()', () => {
    it('returns NOT_FOUND for a hash that was never issued', async () => {
      const { registry } = await deployFixture();
      expect(await registry.verifyCertificate(hashOf('never-issued'))).to.equal(OUTCOME.NOT_FOUND);
    });

    it('returns VERIFIED for an issued, non-revoked certificate', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('verify-1');
      await registry.connect(issuer).issueCertificate(hash, CID);
      expect(await registry.verifyCertificate(hash)).to.equal(OUTCOME.VERIFIED);
    });

    it('returns REVOKED after the certificate has been revoked', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('verify-2');
      await registry.connect(issuer).issueCertificate(hash, CID);
      await registry.connect(issuer).revokeCertificate(hash, 'issued in error');
      expect(await registry.verifyCertificate(hash)).to.equal(OUTCOME.REVOKED);
    });
  });

  describe('revokeCertificate()', () => {
    it('a registered issuer can revoke an existing certificate', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('revoke-1');
      await registry.connect(issuer).issueCertificate(hash, CID);
      await expect(registry.connect(issuer).revokeCertificate(hash, 'issued in error')).to.not.be.reverted;
    });

    it('stores the revocation reason', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('revoke-2');
      await registry.connect(issuer).issueCertificate(hash, CID);
      await registry.connect(issuer).revokeCertificate(hash, 'duplicate submission');
      const stored = await registry.certificates(hash);
      expect(stored.revocationReason).to.equal('duplicate submission');
    });

    it('emits CertificateRevoked with the correct args', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('revoke-3');
      await registry.connect(issuer).issueCertificate(hash, CID);
      const tx = await registry.connect(issuer).revokeCertificate(hash, 'issued in error');
      const block = await ethers.provider.getBlock(tx.blockNumber);
      await expect(tx)
        .to.emit(registry, 'CertificateRevoked')
        .withArgs(hash, issuer.address, 'issued in error', block.timestamp);
    });

    it('a non-issuer cannot revoke, even an existing certificate', async () => {
      const { registry, issuer, stranger } = await deployFixture();
      const hash = hashOf('revoke-4');
      await registry.connect(issuer).issueCertificate(hash, CID);
      await expect(registry.connect(stranger).revokeCertificate.staticCall(hash, 'reason'))
        .to.be.revertedWithCustomError(registry, 'NotIssuer')
        .withArgs(stranger.address);
    });

    it('reverts with CertificateNotFound for a hash that was never issued', async () => {
      const { registry, issuer } = await deployFixture();
      await expect(
        registry.connect(issuer).revokeCertificate.staticCall(hashOf('unknown'), 'reason'),
      )
        .to.be.revertedWithCustomError(registry, 'CertificateNotFound')
        .withArgs(hashOf('unknown'));
    });

    it('reverts with AlreadyRevoked on a double revoke', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('revoke-5');
      await registry.connect(issuer).issueCertificate(hash, CID);
      await registry.connect(issuer).revokeCertificate(hash, 'first reason');
      await expect(registry.connect(issuer).revokeCertificate.staticCall(hash, 'second reason'))
        .to.be.revertedWithCustomError(registry, 'AlreadyRevoked')
        .withArgs(hash);
    });

    it('reverts with EmptyReason for an empty reason string', async () => {
      const { registry, issuer } = await deployFixture();
      const hash = hashOf('revoke-6');
      await registry.connect(issuer).issueCertificate(hash, CID);
      await expect(
        registry.connect(issuer).revokeCertificate.staticCall(hash, ''),
      ).to.be.revertedWithCustomError(registry, 'EmptyReason');
    });
  });
});
