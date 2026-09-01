# L1–L6 Layered Architecture

Six layers, top (HTTP-facing) to bottom (framework-agnostic utilities). Each layer may only call
downward, never upward or sideways to a peer at the same layer — see [Dependency rules](#dependency-rules-d3d5)
below for the two boundaries this project actually enforces in code today.

| Layer | Name | Responsibility | Where it lives |
|---|---|---|---|
| L1 | Routes | HTTP surface: parses the request, calls into L3, shapes the response. Owns no business logic. | `apps/*/src/routes/` |
| L2 | Middleware | Cross-cutting request concerns: auth, request validation, rate limiting. Runs before L1's handler body. | `apps/*/src/middleware/` |
| L3 | Services | Business logic — the system's actual behavior (issuance, verification, revocation, lifecycle transitions). This is the "port" side of the ports-and-adapters boundary. | `apps/*/src/services/` |
| L4 | Adapters | Talks to the outside world (the blockchain, IPFS/Pinata, the identity provider). This is the "adapter" side of the boundary — one adapter per external system, and nothing outside `adapters/` talks to that system directly. | `apps/*/src/adapters/` |
| L5 | Repositories | Data access — the only place raw SQL is written. One repository module per table. | `apps/*/src/repositories/` |
| L6 | lib | Framework-agnostic shared utilities (hashing, id generation, error types, backoff) with no knowledge of HTTP, the database, or any external system. | `apps/*/src/lib/` |

## Ports-and-adapters boundary (L3/L4)

L3 (services) defines *what* the system needs from the outside world, in terms of small,
purpose-shaped functions — that's the "port." L4 (adapters) is the *only* place that actually
knows how to talk to a specific external system to satisfy that port. A service never imports a
third-party client library directly; it receives an adapter (or repository) as a constructor
dependency and calls its port-shaped methods.

Concretely, this means: if this project ever needed to swap Pinata for a different IPFS pinning
service, or Polygon for a different EVM chain, the change is confined to one adapter module — no
service's code changes, because services never knew which concrete external system they were
talking to in the first place.

## Dependency rules (D3–D5)

Three dependency rules are enforced today (by code review and, for D3/D4, by an ESLint
`no-restricted-imports` rule — see `eslint.config.js`):

- **D3 — only `repositories/` (or the app's composition root) may import `pg`.** No service,
  route, or adapter ever runs SQL directly. This is ADR-011's "no ORM, but no ambient database
  access either" decision made concrete.
- **D4 — only `chain.adapter.js` may import `ethers`.** Every other module that needs a
  blockchain provider or signer goes through the small set of helpers `chain.adapter.js` exports,
  so the contract ABI/address/call surface stays in exactly one place.
- **D5 — only `lifecycleService` may write `certificate.status`.** Every other module that needs
  a certificate's status to change calls into `lifecycleService.transition(...)` rather than
  updating the column itself — the single-writer rule that makes the certificate lifecycle state
  model (see `docs/architecture/certificate-lifecycle.md`) actually trustworthy: there is exactly
  one place in the codebase that can put a certificate into an invalid state, so that's the one
  place that needs to be reviewed for state-machine correctness.

Further dependency rules will be added here as the corresponding layers/boundaries are built out
in later weeks — this list reflects what's actually enforced as of Week 1, not a target list
written in advance of the code that would enforce it.

## See also

- `docs/adr/ADR-011-stack-choice.md` — the stack decision this layering is built on (notably, why
  D3 exists: no ORM means the `pg`-confinement rule is what keeps raw SQL from leaking everywhere).
- `docs/architecture/certificate-lifecycle.md` — the state model that D5 protects.
