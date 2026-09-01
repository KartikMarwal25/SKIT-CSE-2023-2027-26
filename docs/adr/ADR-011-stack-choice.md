# ADR-011: Technology Stack Choice

**Status:** Accepted
**Date:** 2026-08-10
**Deciders:** Kartik Marwal (Blockchain & System Architecture)

## Context

SecureCred needs a stack that a small, mixed-experience student team can build and reason about
end to end — backend, database, frontend, and smart contract — without introducing tooling whose
behavior is hard to predict (an ORM's generated SQL, a framework's implicit magic). The system's
correctness properties (certificate integrity, revocation permanence, verification outcomes) are
safety-critical enough that "we can see exactly what runs" outweighs "less code to write."

## Decision

- **Backend runtime:** Node.js LTS, plain JavaScript (ES2022 — no TypeScript). No build step for
  the server; what's on disk is what runs.
- **Database access:** PostgreSQL via `node-postgres` (`pg`) directly. No ORM. Every query is
  hand-written, parameterized SQL, kept in a `repositories/` module per table.
- **Frontend:** React 18 with Tailwind CSS for styling. No component library — Tailwind utility
  classes plus a small set of hand-built shared components.
- **Smart contracts:** Solidity 0.8.x, compiled and tested with Hardhat.

## Rationale

- **No TypeScript:** the team's Solidity and SQL already carry strong typing where it matters
  (contract ABI, column types); adding a second type system to the JS layer is overhead without
  a matching safety win for a project this size.
- **No ORM:** an ORM would generate the SQL that actually runs against certificate/revocation
  data — the one thing in this system that must never be ambiguous. Hand-written parameterized
  SQL means every query is auditable by reading it, not by trusting a query builder's output.
- **Plain JS, no build step (backend):** fewer moving parts between "what's in the repo" and
  "what's running in production" — directly relevant for a team without dedicated DevOps.
- **React + Tailwind (no component library):** keeps the UI's visual language fully under the
  team's control rather than inherited from a third-party design system, and avoids a dependency
  whose breaking changes the team would need to track.

## Consequences

- Every database query must be reviewed for correct parameterization by hand — there's no ORM
  layer catching an accidental string-concatenated query. This is treated as a feature (nothing
  hides how data is read/written), enforced by keeping all `pg` imports confined to
  `repositories/` (see `docs/architecture/layers.md`).
- No compile-time type checking on the JS side means a wrong-shape argument is caught at runtime
  or in review, not by the compiler — mitigated by keeping functions small, parameter shapes
  documented in JSDoc, and a real test suite per layer.
- The frontend has no ready-made component library to fall back on for complex widgets (date
  pickers, data tables) — anything beyond a basic form control gets hand-built.

## Alternatives considered

- **TypeScript backend** — rejected: type-system overhead not justified given the team's Solidity
  contract already enforces the strictest boundary (on-chain state), and the added build step
  works against "what's on disk is what runs."
- **An ORM (e.g., Sequelize/Prisma)** — rejected: generated SQL is exactly the thing this project
  cannot afford to be uncertain about for certificate/revocation writes.
- **A component library (e.g., MUI)** — rejected: would set the visual language early, before the
  UI/UX design pass has happened, and adds a dependency surface the team would need to keep
  updated for the life of the project.

## See also

- `docs/architecture/layers.md` — where the "no ORM, `pg` confined to `repositories/`" rule is
  enforced as a concrete dependency boundary (rule D3).
