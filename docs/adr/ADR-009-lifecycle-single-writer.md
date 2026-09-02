# ADR-009: `lifecycleService` Is the Only Writer of `certificate.status`

**Status:** Accepted
**Date:** 2026-08-20
**Deciders:** Kartik Marwal (Blockchain & System Architecture)

## Context

`certificate.status` drives the seven-state lifecycle model (`docs/architecture/certificate-lifecycle.md`).
Several modules legitimately need a certificate's status to change as a side effect of what
they're doing — the issuance service after pinning a document, the worker after a confirmation
event, the revocation service after a revoke transaction lands. If each of those modules updates
the `status` column directly, the set of valid transitions (`docs/architecture/certificate-lifecycle.md`)
is only true as long as every caller remembers to respect it — nothing in the code actually
enforces it.

## Decision

Only one module, `lifecycleService`, is permitted to write `certificate.status`. Every other
module that needs a status change calls `lifecycleService.transition(certificateId, fromState,
toState, ...)` instead of updating the column itself.

## Rationale

Centralizing every status write in one place means the valid-transition table has exactly one
place to be enforced — `lifecycleService.transition()` itself can (and does) validate that the
requested `fromState -> toState` move is actually in the allowed set before writing anything, and
reject it otherwise. This turns "the lifecycle model is documentation the team should follow" into
"the lifecycle model is code that can't be bypassed by mistake."

## Consequences

- Every module that changes a certificate's status now takes `lifecycleService` as a dependency,
  rather than writing SQL against `certificate.status` itself — even though those modules already
  depend on `certificateRepo` for everything else about the certificate row.
- Code review for any change touching certificate state only needs to check one file
  (`lifecycleService.js`) for lifecycle correctness, regardless of which service triggered the
  change — a reviewer doesn't need to re-verify the whole state machine every time the issuance
  service or the worker changes.
- `certificateRepo`'s own `updateStatus` method (rule D5, alongside D3/D4 — see
  `docs/architecture/layers.md`) is restricted to being called only from `lifecycleService`, not
  from any other module — enforced by code review today, with an ESLint restriction a candidate
  for later once the layer boundary is stable enough to be worth automating.

## Alternatives considered

- **Each service writes `certificate.status` directly, with the transition table enforced only by
  convention/review** — rejected: the whole reason the lifecycle model exists is to make invalid
  states impossible, and "impossible by convention" isn't actually impossible.
- **A database-level trigger enforcing valid transitions** — rejected: pushes the state machine's
  logic into SQL, where it's harder to unit test and further from the rest of the business logic
  it needs to stay consistent with (e.g. emitting the audit log entry alongside the transition).

## See also

- `docs/architecture/certificate-lifecycle.md` — the state model this rule protects.
- `docs/architecture/layers.md` — rule D5.
- `docs/adr/ADR-008-worker-singleton.md` — the worker is one of `lifecycleService`'s primary
  callers.
