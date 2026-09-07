# Certificate Endpoints — Design (FR-ISS)

Design pass ahead of implementation. Two endpoints: creation and retrieval.

## POST /api/v1/certificates

Creates a new certificate issuance request. Requires an authenticated institution actor.

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `holderName` | string | yes | Printed on the certificate document. |
| `holderEmail` | string | yes | Mandatory — matches the holder to a student record (existing or newly provisioned). |
| `enrollmentNumber` | string | yes | Scoped to the issuing institution. |
| `title` | string | yes | The credential's title as it should appear on the document. |
| `certificateType` | string | yes | One of `DEGREE`, `DIPLOMA`, `COURSE_COMPLETION`. |
| `course` | string | yes | Programme name. |
| `gradeOrResult` | string | no | Optional — not every credential type has a grade. |
| `issueDate` | string (ISO date) | yes | Cannot be in the future. |
| `attributes` | object | no | Extra fields folded into the document and its hash — shape depends on `certificateType` (see below), not free-form. |

### Per-type `attributes` shape (Week 4)

Each `certificateType` only accepts its own attribute keys — an unrecognised key for that type is a
`400`, not silently dropped or stored:

| `certificateType` | Allowed `attributes` keys |
|---|---|
| `DEGREE` | `cgpa` (number, 0-10), `honours` (boolean) |
| `DIPLOMA` | `grade` (string) |
| `COURSE_COMPLETION` | `durationHours` (positive number) |

**Response — `202 Accepted`** (issuance is async: storage and on-chain anchoring both take time):

```json
{
  "status": "ok",
  "certificateId": "uuid",
  "certificateNumber": "SKIT-2026-XXXXXXXXXXXX",
  "status": "PENDING_STORAGE",
  "verifyUrl": "https://.../verify/SKIT-2026-XXXXXXXXXXXX"
}
```

The response does not include a transaction hash or on-chain confirmation — those don't exist yet
at the moment this responds. A caller checks progress via a separate status endpoint (out of scope
for this week's design). As of Week 4 this endpoint validates the request body and responds `501`
on anything that passes validation — the write path itself lands with the L3/L4 service layer
(Week 6).

## GET /api/v1/certificates/:id

Retrieves a single certificate's full detail. Requires the caller to be either the issuing
institution or the certificate's holder — scope-checked, not just authenticated.

**Response — `200 OK`:**

```json
{
  "status": "ok",
  "certificateId": "uuid",
  "certificateNumber": "SKIT-2026-XXXXXXXXXXXX",
  "title": "Bachelor of Technology in Computer Science",
  "holderName": "Asha Verma",
  "status": "ACTIVE",
  "issueDate": "2026-06-15",
  "certificateHash": "64-char hex",
  "txHash": "0x...",
  "ipfsCid": "Qm..."
}
```

`txHash`/`ipfsCid`/`certificateHash` are `null` while the certificate is still in a pre-`ACTIVE`
state — they only exist once storage and anchoring have actually happened.

## Error responses (shared shape)

Every non-2xx response uses the same envelope, regardless of which endpoint:

```json
{
  "status": "error",
  "code": "E_VALIDATION",
  "message": "Human-readable, safe to show a user.",
  "correlationId": "uuid"
}
```

A `400` from `POST /certificates` additionally carries a `fields` array — one entry per failing
field, `{ "path": "attributes.cgpa", "message": "..." }` — so the form can show errors inline
rather than a single generic banner.

- `404` — the certificate doesn't exist, or the caller isn't allowed to see it (deliberately the
  same response either way — a 403 for someone else's certificate would leak that the ID is real).
- `400` — malformed request body (missing/wrong-typed field, or an attribute that doesn't belong to
  the given `certificateType`).
- `401` — no valid auth.

## See also

- `contracts/src/SecureCredRegistry.sol` (Kartik, Week 3) — `certificateHash` and `ipfsCid` in the
  response above map directly to that contract's `Certificate` struct fields.
- `packages/shared/src/schemas.js` (Week 4) — `issuanceRequestSchema` is the enforceable version of
  the request-body table above, shared between the API and the web client.
