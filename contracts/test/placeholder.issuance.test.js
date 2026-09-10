// SPDX-License-Identifier: MIT
// describe/it are Hardhat's injected Mocha globals — no require needed (and
// requiring the `mocha` package directly here breaks them).
const { expect } = require('chai');
const { ethers } = require('hardhat');

/**
 * "1. Valid issuance" is real this week — Kartik's Week 5 contract now
 * actually writes to `certificates` and emits CertificateIssued
 * (docs/testing/test-strategy.md's two open questions — initial status and
 * event signature — are both resolved by that change). "2. Duplicate
 * prevention" and "3. Access control" stay placeholders: duplicate
 * prevention at the contract level and access control are still genuinely
 * untested here — this week's task is scoped to hash/CID storage +
 * event-emission checks only, not those.
 */
describe('Certificate issuance', () => {
  async function deployFixture() {
    const [issuer] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory('SecureCredRegistry');
    const registry = await Registry.deploy();
    return { registry, issuer };
  }

  function hashOf(label) {
    return ethers.keccak256(ethers.toUtf8Bytes(label));
  }

  const CID = 'bafybeigdyrztest1234567890abcdefghijklmnopqrstuvwxyz';

  describe('1. Valid issuance', () => {
    it('issueCertificate(hash, cid) with a fresh hash does not revert', async () => {
      const { registry } = await deployFixture();
      await expect(registry.issueCertificate(hashOf('cert-1'), CID)).to.not.be.reverted;
    });

    it('certificates(hash) reflects certificateHash/ipfsCid/issuer/issuedAt after issuance', async () => {
      const { registry, issuer } = await deployFixture();
      const certHash = hashOf('cert-2');

      const tx = await registry.issueCertificate(certHash, CID);
      const block = await ethers.provider.getBlock(tx.blockNumber);

      const stored = await registry.certificates(certHash);
      expect(stored.certificateHash).to.equal(certHash);
      expect(stored.ipfsCid).to.equal(CID);
      expect(stored.issuer).to.equal(issuer.address);
      expect(stored.issuedAt).to.equal(BigInt(block.timestamp));
    });

    it('certificates(hash).status starts at PENDING_STORAGE (enum index 0)', async () => {
      const { registry } = await deployFixture();
      const certHash = hashOf('cert-3');

      await registry.issueCertificate(certHash, CID);

      const stored = await registry.certificates(certHash);
      expect(stored.status).to.equal(0n);
    });

    it('issuance emits CertificateIssued with the correct args', async () => {
      const { registry, issuer } = await deployFixture();
      const certHash = hashOf('cert-4');

      const tx = await registry.issueCertificate(certHash, CID);
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
    it.skip('TODO: any address can call issueCertificate today — known gap, not yet enforced', () => {});
    it.skip('TODO: a non-issuer reverts once access control lands (Week 6, error name pending)', () => {});
  });
});
