# SecureCredRegistry — gas profile

Measured via `hardhat-gas-reporter` (bundled with `@nomicfoundation/hardhat-toolbox`) against the
full contract test suite, Solidity 0.8.36, optimizer enabled at 200 runs, local Hardhat network.

To reproduce:

```bash
cd contracts
REPORT_GAS=true npx hardhat test
```

## Deployment

| Contract | Gas | % of a 60M gas block |
|---|---|---|
| `SecureCredRegistry` | 705,804 | 1.2% |

## Per-call costs

| Method | Min | Max | Avg | Notes |
|---|---|---|---|---|
| `registerIssuer` | 45,162 | 45,162 | 45,162 | One-time per institution onboarded |
| `deregisterIssuer` | 23,230 | 23,230 | 23,230 | Rare — offboarding |
| `issueCertificate` | 99,289 | 1,565,881 | 298,527 | Once per certificate issued — the hot path; wide range explained below |
| `revokeCertificate` | 57,441 | 57,537 | 57,480 | Once per revocation |

`issueCertificate`'s range is wide for the same reason as before — the suite includes an edge-case
call with a 2000-character `ipfsCid` (Week 6's malformed-input test) alongside normal-length ones.
Isolated measurements:

| Scenario | Gas |
|---|---|
| Empty `ipfsCid` | ~99,000 |
| Typical CIDv1 (~53 chars, e.g. `bafybeigdyrztest...`) | 165,013 |
| 2000-char `ipfsCid` | 1,565,881 |

## Storage packing (Week 15)

**What changed:** `Certificate`'s field order was rearranged so `issuer` (20 bytes) and `status`
(an enum backed by `uint8`, 1 byte) sit adjacently — the compiler packs them into one 32-byte
storage slot instead of two. `certificateHash`/`issuedAt` (32 bytes each) and the two `string`
fields are unaffected by reordering; they each occupy their own slot(s) regardless of position.

**Measured effect:** a typical-CID `issueCertificate` call dropped from 167,104 gas (pre-Week-15
struct layout, same `revocationReason` field Week 10 added) to 165,013 gas — a real, measured
2,091 gas (~1.25%) reduction per issuance. Smaller than a naive "one whole SSTORE slot saved ≈
20,000 gas" estimate would suggest; the actual EVM cold/warm access accounting under Berlin/London
rules doesn't map onto that simple mental model as cleanly as it sounds. Reporting the number that
was actually measured, not the one the theory predicted.

**Correctness:** all 23 existing tests pass unchanged after the reorder — this is a storage-layout
change only, no behavioral difference.

## Batching — evaluated, not implemented

An institution issuing many certificates in one sitting (a graduating cohort) currently pays
`issueCertificate`'s full per-call cost — including a repeated `onlyIssuer` check and `SLOAD` of
`certificates[hash]` for the duplicate check — once per certificate, with no shared savings across
calls in the same transaction. A batch entry point
(`issueCertificates(bytes32[] hashes, string[] cids)`) would amortize some of that fixed overhead.

Not implemented this week: it's a genuine **new public function**, not a pure optimization of
existing behavior — it needs its own access-control tests, its own edge-case tests (partial-batch
failure semantics: does one bad hash in a batch of 50 revert the whole batch, or skip just that
one?), and its own gas profile, none of which fit "gas-optimization pass" as a same-week scope
without either rushing that design or letting this week bleed into inventing an interface nobody's
asked for yet. Flagged here as a real, sized opportunity for whoever picks up bulk-issuance UX
later, not silently dropped.

## Not yet measurable

On-chain verification is measurable now (`verifyCertificate` — see below), but it's a `view` call:
free when read via `eth_call` off-chain (the only path anything in this system actually uses), so
there's no gas cost to profile for it in normal operation.
