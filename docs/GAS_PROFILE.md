# SecureCredRegistry — gas profile (Sprint 2 build)

Measured via `hardhat-gas-reporter` (bundled with `@nomicfoundation/hardhat-toolbox`) against
`contracts/test/placeholder.issuance.test.js`, Solidity 0.8.36, optimizer enabled at 200 runs,
local Hardhat network.

To reproduce:

```bash
cd contracts
REPORT_GAS=true npx hardhat test
```

## Deployment

| Contract | Gas | % of a 60M gas block |
|---|---|---|
| `SecureCredRegistry` | 510,255 | 0.9% |

## Per-call costs

| Method | Min | Max | Avg | Notes |
|---|---|---|---|---|
| `registerIssuer` | 45,117 | 45,117 | 45,117 | One-time per institution onboarded |
| `deregisterIssuer` | 23,252 | 23,252 | 23,252 | Rare — offboarding |
| `issueCertificate` | 98,750 | 1,565,346 | 387,002 | Once per certificate issued — the hot path; wide range explained below |

`issueCertificate`'s range is wide because the test suite deliberately includes an edge-case call
with a 2000-character `ipfsCid` (Week 6's malformed-input test) alongside normal-length ones —
that single outlier pulls the reported average up. Isolated measurements give a clearer picture:

| Scenario | Gas |
|---|---|
| Empty `ipfsCid` | 98,750 |
| Typical CIDv1 (~53 chars, e.g. `bafybeigdyrztest...`) | 164,479 |
| 2000-char `ipfsCid` | 1,565,346 |

## What drives the cost

`issueCertificate` writes a full `Certificate` struct to a previously-empty storage slot (`SSTORE`
from zero → non-zero is the most expensive EVM storage operation, ~20,000 gas per slot) plus a
dynamically-sized `string` field (`ipfsCid`) — cost scales roughly linearly with CID length, which
is why the 2000-char outlier costs ~9.5x the typical case. Real IPFS CIDs (CIDv1, base32) are a
fixed, short length (~59 chars) in practice, so the typical-case number (~164k gas) is what
actually matters once real CIDs are wired in — the 2000-char case only exists to prove the
contract doesn't silently break or run out of gas on an oversized input, not because real usage
looks like that.

`registerIssuer`/`deregisterIssuer` are cheap by comparison — they flip a single `bool` in the
`isIssuer` mapping, no struct, no dynamic string.

## Not yet measurable

Revocation and on-chain verification don't exist in this build yet (later Sprint tasks), so
there's nothing to profile for them — this doc gets a revocation section once that lands.
