# Sprint 2 test suite — handoff to Sprint 3

## Contract suite (`contracts/test/`)

`placeholder.issuance.test.js` — 13 passing, 3 pending, run via `npm test` (Hardhat's own
network) or `npm run test:ganache` (real Ganache). Coverage: 100% statements, 83.33% branch,
100% functions, 93.33% lines — see `docs/testing/coverage-report.md` for the full breakdown.

| Category | Status |
|---|---|
| 1. Valid issuance | Real — 4 tests |
| 2. Duplicate prevention | Placeholder — 2 `it.skip` (out of scope through Sprint 2) |
| 3. Access control | Real — 5 tests |
| 4. Edge cases — malformed input | Real — 2 tests |
| 5. Edge cases — gas | Real — 1 test |
| 6. Edge cases — re-entrancy | Placeholder — 1 `it.skip` (no external call exists to re-enter yet) |

Plus `toolchain.smoke.test.js` (Week 1, proves the compile→deploy→call pipeline, not
feature-specific).

## API suite (`apps/api/src/**/*.test.js`)

Run via `npm test` inside `apps/api/`. All Jest, `jest.unstable_mockModule` used everywhere a real
Postgres/network dependency needs mocking out.

| File | What it covers | Real dependency used? |
|---|---|---|
| `lib/certId.test.js` | DP-01 certificate-number format, uniqueness, malformed-input rejection | None — pure function |
| `repositories/certificate.constraints.test.js` | `certificate` table's UNIQUE constraints (`certificate_number`, `certificate_hash`) | Real Postgres, isolated throwaway schema |
| `routes/health.test.js` | `GET /health` shape | Mocked `pool` |
| `routes/certificates.routes.test.js` | `POST`/`GET /certificates` validation and status codes | None — router mounted standalone |
| `adapters/chain.adapter.test.js` | `chain.adapter.js` calls `issueCertificate` on the right contract with the right args | Mocked `ethers` + `node:fs` |

## What Sprint 2 does NOT cover (by design, not oversight)

- No end-to-end test that actually issues a certificate through the full stack (form → API → DB →
  chain) — the write path itself doesn't exist yet (Sprint 3 work, see
  `docs/api/api-reference.md`'s "What Sprint 3 needs to wire together").
- No auth tests — there is no auth middleware in this build.
- No frontend component/interaction tests — this project's testing investment through Sprint 2 has
  gone entirely into the contract and API layers; `apps/web` is verified by build success only.

## Baseline coverage summary for Sprint 3

- Contract: 100% stmts/funcs, 83.33% branch, 93.33% lines (one known gap: duplicate-prevention revert path, tracked, not accidental).
- API: no aggregate coverage tool run yet — each file above is exercised by at least one real assertion, but nothing like `nyc`/`c8` has been wired into `apps/api` the way `solidity-coverage` was wired into `contracts` this sprint. Worth doing in Sprint 3 once there's more API surface to measure.
