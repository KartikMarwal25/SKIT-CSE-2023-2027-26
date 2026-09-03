// SPDX-License-Identifier: MIT
// describe/it are Hardhat's injected Mocha globals — no require needed (and
// requiring the `mocha` package directly here breaks them; found while
// verifying this file under `hardhat test` this week).
//
// Placeholder test cases for the issuance flow, expanded from Week 2's 4
// generic TODOs into the concrete plan in docs/testing/test-strategy.md now
// that Kartik's Week 3 skeleton (issueCertificate() stub) exists. Still all
// skipped — the function body is a TODO stub with no write path, no event,
// and no access control yet, so nothing here has anything real to assert
// against. Each becomes a real test as its part of the TODO lands.
describe('Certificate issuance (placeholder — write path not yet implemented)', () => {
  describe('1. Valid issuance', () => {
    it.skip('TODO: issueCertificate(hash, cid) with a fresh hash does not revert');
    it.skip('TODO: certificates(hash) reflects certificateHash/ipfsCid/issuer/issuedAt after issuance');
    it.skip('TODO: certificates(hash).status starts at PENDING_STORAGE (pending confirmation from Kartik)');
    it.skip('TODO: issuance emits CertificateIssued (event not yet declared on the contract)');
  });

  describe('2. Duplicate prevention', () => {
    it.skip('TODO: issuing the same certificateHash twice reverts with CertificateAlreadyExists');
    it.skip('TODO: issuing two different hashes from the same caller succeeds independently');
  });

  describe('3. Access control', () => {
    it.skip('TODO: any address can call issueCertificate today — known Week 3 gap, not yet enforced');
    it.skip('TODO: a non-issuer reverts once access control lands (Week 4-6, error name pending)');
  });
});
