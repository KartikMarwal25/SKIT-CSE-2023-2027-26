# ADR-008: The Worker Runs as a Single Process

**Status:** Accepted
**Date:** 2026-08-18
**Deciders:** Kartik Marwal (Blockchain & System Architecture)

## Context

Once certificates are anchored on-chain, something has to listen for confirmation events and
reconcile any certificate that got stuck mid-anchor (a dropped RPC connection, a transaction that
never confirmed). That "something" — `securecred-worker` — needs to update `certificate.status`
as events arrive. The API (`securecred-api`) is designed to run as multiple stateless instances
behind a load balancer; the worker is not.

## Decision

`securecred-worker` runs as exactly one process at a time. It is never horizontally scaled the way
the API is.

## Rationale

If two worker instances both listened for the same chain events, both would try to react to the
same confirmation — racing to write `certificate.status`, or double-processing the same event.
Coordinating multiple worker instances (a lock, a leader election) is real distributed-systems
complexity that this system's actual event volume doesn't justify: certificate issuance and
revocation are low-frequency, backend-initiated actions, not a high-throughput stream a single
process could plausibly fall behind on.

## Consequences

- The worker is a single point of failure for confirmation processing — if it's down, certificates
  stay in `ANCHORING`/`REVOKING` longer than they should, but nothing is lost: the reconciliation
  sweep (a periodic poll, independent of the live event listener) catches up once the worker is
  back, rather than requiring every event to have been caught live.
- Deployment must guarantee at most one worker instance is ever running — this is an operational
  constraint to enforce at the infrastructure level (a singleton deployment, not a replica set),
  not something the application code defends against itself.
- If certificate volume ever grew enough to bottleneck a single worker, the fix is sharding by
  some partition key (e.g. institution), not naively running N identical replicas — that's a
  future decision, not something this ADR needs to solve now.

## Alternatives considered

- **Multiple worker replicas with a distributed lock** — rejected for now: real complexity with no
  current throughput problem to justify it.
- **No separate worker; the API polls for confirmations on each request** — rejected: couples
  confirmation latency to whichever request happens to ask, and duplicates polling logic across
  every API instance instead of having it in one place.

## See also

- `docs/adr/ADR-009-lifecycle-single-writer.md` — the related single-writer rule for
  `certificate.status` itself, which the worker is the primary caller of.
