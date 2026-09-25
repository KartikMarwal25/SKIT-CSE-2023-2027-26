# Sprint 2 Contract Coverage Report

## How to run

```
cd contracts
npm run coverage
```

Uses `solidity-coverage`, bundled with `@nomicfoundation/hardhat-toolbox` — no extra dependency
needed beyond what Week 1 already installed. Reports are written to `contracts/coverage/` (HTML)
and `contracts/coverage.json`; neither is committed (build output).

## Result (Week 7)

```
--------------------------|----------|----------|----------|----------|----------------|
File                      |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------------------|----------|----------|----------|----------|----------------|
 src/                     |      100 |    83.33 |      100 |    93.33 |                |
  SecureCredRegistry.sol  |      100 |    83.33 |      100 |    92.31 |             89 |
  _ToolchainSmokeTest.sol |      100 |      100 |      100 |      100 |                |
--------------------------|----------|----------|----------|----------|----------------|
All files                 |      100 |    83.33 |      100 |    93.33 |                |
--------------------------|----------|----------|----------|----------|----------------|
```

Line 89 (`revert CertificateAlreadyExists(certificateHash);`) is the one uncovered line — it maps
exactly to `contracts/test/placeholder.issuance.test.js`'s "2. Duplicate prevention" section, which
is still `it.skip` (out of scope through Week 6, per that file's own header comment). The coverage
tool independently confirms the same gap the test plan already documented — nothing new here, just
a second, automated source agreeing with the manual tracking.

## Flaky-test stabilisation

Two things checked this week:

1. **Ran the full suite 5 times in a row** (`npx hardhat test`, back to back) — 13 passing / 3
   pending every time, no flakes. Each test deploys its own fresh contract instance via
   `deployFixture()` rather than sharing state across tests, which is most of why: there's no
   cross-test state to leak.
2. **The one real instability found this sprint** was network-dependent, not test-order-dependent:
   running the suite against a real Ganache instance (`npm run test:ganache`) failed 5 of the
   "3. Access control" cases — see Kartik's Week 7 fix in `contracts/test/placeholder.issuance.test.js`
   (`.staticCall` instead of a direct state-changing call for every revert assertion). Verified
   passing on both networks after that fix; that's the actual "stabilise any flaky tests" outcome
   for this week, filed under whoever's change caused it rather than duplicated here.

## Final Week 7 verification

`npm run coverage` and `npm test` both re-run clean after all of the above: 13 passing / 3
pending, same coverage numbers as above. No regressions from this week's changes.
