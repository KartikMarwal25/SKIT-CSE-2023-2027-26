# API reference — Sprint 2 handoff

What's actually implemented and runnable as of the end of Sprint 2 (Week 8), for whoever picks up
integration work in Sprint 3. Design intent lives in `docs/api/certificate-endpoints.md`; this doc
is the current, factual state.

## `GET /api/v1/health`

Real, done since Week 1. Returns `{"status":"ok","postgres":"ok"}` (200) or
`{"status":"error","postgres":"down"}` (503) depending on whether the configured Postgres actually
answers `SELECT 1`.

## `POST /api/v1/certificates`

Validates the request body against `issuanceRequestSchema` (`@securecred/shared`), including
per-`certificateType` `attributes` shapes (Week 4). A valid payload still gets `501
E_NOT_IMPLEMENTED` — nothing writes to the database or the chain from this endpoint yet. An invalid
payload gets `400 E_VALIDATION` with a `fields` array (one entry per failing field).

**Not yet wired to this route, but exist as standalone, tested pieces:**
- `apps/api/src/lib/certId.js` — `allocateCertificateNumber()`, the DP-01 certificate-number scheme.
- `apps/api/src/adapters/chain.adapter.js` — `issueCertificate()`, calls the deployed contract (integration-tested against a mock this week, not a live network).

Wiring these three together into an actual write path is Sprint 3 work.

## `GET /api/v1/certificates/:id`

Real, done since Week 5, refactored onto the L1→L3→L5 layering (routes → `certificateService.js` →
`certificate.repo.js`) in Week 6. Returns the certificate's database row (metadata, holder,
`certificate_hash`) as JSON, or `404 E_NOT_FOUND` if the id doesn't exist, or `400 E_VALIDATION` if
the id isn't a UUID. `ipfsCid`/`txHash` are not part of the response yet — nothing writes them from
this build.

## Error envelope

Every non-2xx response is `{"status":"error","code":"...","message":"...","fields"?:[...]}`,
produced by `error-handler.mw.js` from an `AppError` (Week 7). `ERROR_CODE`/`ERROR_STATUS`
(`@securecred/shared`) currently define 5 codes — the rest of the SRS's EX-01…EX-14 catalogue maps
to features (auth, revocation, IPFS, blockchain confirmation) that don't exist in this build yet.

## What Sprint 3 needs to wire together

1. A real issuance service that calls `certId.js` → writes a `PENDING_STORAGE` row via a new
   `certificate.repo.js` insert method → calls `chain.adapter.js` → updates the row's status.
2. A live network config (`chainNetwork`, RPC URL, signer key) — `chain.adapter.js` currently takes
   a `network` name and a signer directly; nothing constructs those from environment yet.
3. Auth — every route above is unauthenticated today; there is no session/role check anywhere in
   this build.
