# Sprint 3 regression report — for the team

Full re-run of every automated check across all three workspaces, fresh, after Week 12's changes
landed. This is the actual state as of the end of Sprint 3, not a summary of what should be true.

## Results

| Workspace | Command | Result |
|---|---|---|
| `contracts` | `npx hardhat test` | 23 passing, 3 pending |
| `contracts` | `npx hardhat coverage` | 100% stmts, 92.31% branch, 100% funcs, 96.55% lines |
| `apps/api` | `npm test` | 8 suites, 38 passing, 1 skipped |
| `apps/web` | `npm run build` | 54 modules, clean |

No regressions from Sprint 2 into Sprint 3 — every suite that passed at the Week 8 handoff still
passes now.

## Coverage improved this sprint

Branch coverage went from 83.33% (Week 7) to 92.31%; line coverage from 93.33% to 96.55%. The one
remaining uncovered line is unchanged and still tracked on purpose: `issueCertificate`'s
`CertificateAlreadyExists` revert, still gated behind the still-`it.skip`'d "2. Duplicate
prevention" section (`contracts/test/placeholder.issuance.test.js`) — not a new gap, the same one
flagged since Week 5.

## What's new and load-bearing this sprint

- **Auth is real** — `@clerk/backend` token verification, `requireAuth`/`requireRole` middleware,
  a live `GET /auth/me`.
- **`verifyCertificate()`/`revokeCertificate()`** exist on-chain and are wired end-to-end: real API
  routes → `certificateService.js` → `chain.adapter.js` → the deployed Ganache contract. Verified
  with both mocked route tests (`certificates.routes.test.js`) and direct testing against the real
  deployed contract during development (not part of the committed test suite, since that needs a
  live Ganache instance the automated suite doesn't assume).
- **`lifecycleService.js`** makes ADR-009 real — the 7-state transition table from Week 1 is now
  enforced in code, not just documentation.
- **IPFS/Pinata** integration, with the DP-03 gateway failover order verified under both sequential
  and 50-way concurrent load.
- **Rate limiting** (DP-02) is wired into the two routes that exist to rate-limit; thresholds
  verified under simulated load with fake timers.
- **Verifier portal**: identifier entry, QR scanning, a genuinely distinct four-outcome result
  screen, the mandatory AD-05/UI-07 scope note, and now a fifth (non-)outcome — the FR-VER-006
  degraded state for an unreachable chain RPC.

## Two real bugs found and fixed this sprint (not invented for this report)

1. **Week 7** — `revertedWithCustomError` assertions failed against real Ganache (passed fine on
   Hardhat's own network) because Ganache's `eth_estimateGas` error doesn't carry decodable revert
   data. Fixed by asserting on `.staticCall(...)` instead of the state-changing call directly.
2. **Week 12** — `chain.adapter.js`'s custom-error decoding for `revokeCertificate()` failed the
   same way initially: `err.data` came back `null` against real Ganache. The actual revert bytes
   were nested at `err.info.error.data.result` instead. Fixed with a fallback chain checking all
   three shapes; verified against a real deployed contract before it was declared working.

Both were caught specifically because this project's own convention has been to verify against a
real Ganache instance rather than trusting Hardhat's built-in network alone — worth keeping that
habit going into Sprint 4.

## What Sprint 3 does NOT cover (known, not accidental)

- No live testnet (Polygon Amoy) deployment yet — everything above is Ganache-only.
- No worker/event-listener — transactions aren't confirmed asynchronously; the API returns a
  `txHash` and stops there.
- No frontend wiring for issuance itself (`POST /certificates` is still `501`) — Sprint 3's wiring
  was verify/revoke only, per this sprint's own scope.
- `lifecycleService.transition()` exists but nothing calls it yet — no code path currently moves a
  certificate through `PENDING_STORAGE → ... → ACTIVE`, since the write path itself isn't built.
  That's Sprint 4 work.
