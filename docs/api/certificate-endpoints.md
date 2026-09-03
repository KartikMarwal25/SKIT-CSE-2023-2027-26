# Certificate Endpoints — Design (FR-ISS)

Design pass ahead of implementation (Week 4). Two endpoints this week: creation and retrieval.

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
| `attributes` | object | no | Free-form extra fields, folded into the document and its hash. |

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
for this week's design).

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

- `404` — the certificate doesn't exist, or the caller isn't allowed to see it (deliberately the
  same response either way — a 403 for someone else's certificate would leak that the ID is real).
- `400` — malformed request body (missing/wrong-typed field).
- `401` — no valid auth.

## See also

- `contracts/src/SecureCredRegistry.sol` (Kartik, this week) — `certificateHash` and `ipfsCid` in
  the response above map directly to that contract's `Certificate` struct fields.
