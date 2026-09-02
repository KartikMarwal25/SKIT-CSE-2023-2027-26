// SPDX-License-Identifier: MIT

// Placeholder test cases for the issuance flow — stubbed out ahead of
// Kartik's real contract skeleton (Week 3) so the test plan is visible and
// reviewable before there's anything to run it against. Each becomes a real
// test once the corresponding contract function exists; none of these
// should stay skipped past Week 3.
describe('Certificate issuance (placeholder — contract not yet implemented)', () => {
  it.skip('TODO: a registered issuer can anchor a new certificate');
  it.skip('TODO: anchoring the same certificate hash twice reverts');
  it.skip('TODO: a non-issuer cannot anchor a certificate');
  it.skip('TODO: anchoring emits a CertificateAnchored event with the correct hash/CID');
});
