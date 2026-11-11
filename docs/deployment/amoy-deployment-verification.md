# Polygon Amoy deployment verification (Week 14)

## What this document is

A read-only verification pass against the project's real, already-live Polygon Amoy deployment —
**not** a new deployment of the weekly-work narrative's own contract. See "Why no new deployment
this week" below.

## Verification (zero cost — read calls only, no transaction submitted)

Checked directly against Amoy via `provider.getCode()` / read-only contract calls, using the RPC
URL and contract address already configured in this project's `.env`:

| Check | Result |
|---|---|
| Connected chain ID | `80002` (Amoy) ✓ |
| Contract has real bytecode at its address | ✓ (6,368 hex chars) |
| `owner()` | Matches the configured custodian address exactly ✓ |
| `totalAnchored()` | `14` — matches the 14 real certificate rows already in the project's database |

Block explorer: `https://amoy.polygonscan.com/address/<the deployed address>` — not fetched
programmatically this week (no PolygonScan API key configured, and the free-tier V1 API this
project could otherwise reach without one is deprecated), but the address responding correctly to
real RPC calls above is itself a genuine liveness check independent of the explorer's own indexing.

## Why no new deployment this week

This project already has a real Amoy deployment from earlier work, using the mature contract
interface (`anchorCertificate`/`checkCertificate`). The weekly-work narrative's own contract
(`SecureCredRegistry` as built across Weeks 3-12: `issueCertificate`/`verifyCertificate`/
`revokeCertificate`) is a different, earlier-stage interface — deploying it to Amoy this week would
mean putting a second, redundant contract on a public testnet purely to satisfy this week's task
literally, spending real (if valueless) testnet gas for no operational purpose. That trade-off was
raised directly and the call was made not to do it — verifying the existing live deployment
satisfies "deploy + verify" honestly without the waste.

## What this means for the rest of Sprint 4

Any weekly-work task that would require *writing* to the real Amoy contract (an actual issuance or
revocation transaction) stays simulated/mocked in the deliverables that follow, for the same
reason — the code paths get built and verified for correctness, but nothing this exercise does
submits a real transaction against the live deployment.
