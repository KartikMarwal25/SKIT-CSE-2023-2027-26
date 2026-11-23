# `securecred-worker` event-listener spec

Design only — `apps/worker` doesn't exist in this build yet. This spec exists so implementing it
later is translation, not design-while-coding. Builds directly on ADR-008 (singleton) and ADR-009
(`lifecycleService` is the sole status writer).

## What it listens for

Two contract events, both already defined on `SecureCredRegistry` (Weeks 5, 10):

- `CertificateIssued(bytes32 certificateHash, address issuer, string ipfsCid, uint256 issuedAt)`
- `CertificateRevoked(bytes32 certificateHash, address revokedBy, string reason, uint256 revokedAt)`

## Startup: replay before subscribe

A live event subscription alone misses anything that happened while the worker was down. On
start, the listener:

1. Reads the last-processed block number from a durable cursor (a `worker_cursor` table — not
   built yet, needs its own migration).
2. Queries the contract's event logs from `cursor+1` to the current block (`getLogs`, a bounded
   historical query — this is why "worker_cursor" needs to be durable, not in-memory: an in-memory
   cursor forgets everything on restart, defeating the entire point of replaying).
3. Processes each missed event through the same handler live events use (below) — no separate
   "catch-up" code path, so there's only one place event-handling logic can be wrong.
4. Only after replay is caught up does it attach the live subscription and start advancing the
   cursor as new blocks arrive.

## Per-event handling

For both events, the same shape:

1. Look up the certificate by `certificateHash`. Unknown hash → log and skip (not an error — could
   be an event from a different deployment/environment sharing a log stream in a misconfigured
   setup; better to skip loudly than crash).
2. Check the certificate is actually in the state that event implies it's leaving
   (`ANCHORING` for issuance-confirmed, `REVOKING` for revocation-confirmed). If it's already past
   that state, skip — this event was already processed (replay safety: processing the same event
   twice must be a no-op, not a double-transition error).
3. Check confirmation depth has actually been reached (a very recent block can still be
   reorganized) — if not yet deep enough, skip; a later poll or the reconciler's sweep will catch
   it once it is.
4. Call `lifecycleService.transition(certificateId, fromState, toState, ...)` — never write
   `certificate.status` directly (rule D5). This is the ONLY module besides the future issuance/
   revocation services permitted to call it, and its calls are always confirmation-driven, never
   speculative.

## Singleton (ADR-08) — why nonce serialization is the concrete reason, not just "avoid races"

ADR-008 already decided the worker runs as one process. The event listener itself doesn't need to
*send* transactions (it's read-only — watching events, writing to Postgres). But the worker
process, more broadly, is also where custodian-signed retry/reconciliation transactions would
originate (not built yet). If two worker instances both tried to send transactions from the same
custodian wallet, they'd both fetch "the next nonce" independently and race — one transaction
would be rejected outright ("nonce too low") or, worse, silently replace the other if the nonces
happened to collide exactly.

This isn't theoretical: exactly this failure mode showed up during this week's own testing (see
`docs/testing/nonce-collision-note.md`) — reusing a Ganache instance across two separate script
runs against the same account produced precisely a "tx doesn't have the correct nonce" error.
Nothing about that was a bug in the contract or the adapter; it was two independent processes both
assuming they alone controlled that account's nonce sequence. A single worker process (ADR-008)
sidesteps this by construction: there is only ever one thing deciding "what's the next nonce for
the custodian wallet," because there's only one process that exists to ask.

## What this spec deliberately leaves open

- The exact schema for `worker_cursor` (one row per network? per event type?) — a real design
  decision, not filled in here to avoid guessing ahead of the migration that would define it.
- Retry/backoff behavior when a transition call itself fails (DB down mid-processing) — needs its
  own design pass once `lifecycleService`'s own error modes are better understood in practice.
- Confirmation-depth's actual value for each network (Ganache's instant finality makes this
  meaningless there; Amoy needs a real, considered number) — a deployment-config decision, not an
  architectural one.
