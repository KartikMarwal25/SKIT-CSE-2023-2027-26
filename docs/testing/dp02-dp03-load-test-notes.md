# DP-02 / DP-03 load-test notes (Week 11)

## What "simulated load" means here

No real network traffic or external load-generation tool — these are in-process Jest tests that
fire many requests through the actual middleware/adapter functions in a tight loop (rate limiter)
or concurrently via `Promise.all` (IPFS failover), using fake timers where wall-clock time would
otherwise make the test flaky or slow.

## DP-02 — rate-limit thresholds (`rate-limiter.mw.test.js`)

| Case | What it proves |
|---|---|
| Exactly `max` allowed, rest rejected | The auth limit (10/min) is a hard boundary, not approximate |
| Window reset | After `windowMs` elapses, the same key gets a fresh allowance (verify: 30/min) |
| Per-key isolation | Institution A hitting its ceiling doesn't affect institution B (issuance: 60/hr) |
| Two stacked limiters | 20 minute-windows of 30 requests (600 total) stay under the 30/min cap throughout, and exactly trip the 600/hr cap on the 601st — proving the two windows are genuinely independent, not just one disguised as two |

## DP-03 — IPFS gateway failover under concurrency (`pinata.adapter.test.js`)

50 concurrent `fetchByCid()` calls, each gateway 1 failing / gateway 2 succeeding, fired via
`Promise.all` rather than one at a time. All 50 correctly fell through to gateway 2 and returned
the right content — confirms the per-call gateway loop uses only local state (no shared mutable
loop variable that concurrent calls could stomp on), which the earlier, sequential-only Week 10
tests couldn't have caught on their own.

## Result

Full `apps/api` suite: 8 test suites, 31 passing / 1 skipped. No flakes across repeated runs.
