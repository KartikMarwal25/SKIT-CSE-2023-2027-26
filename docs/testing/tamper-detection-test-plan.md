# Tamper-detection test plan (FR-VER-003's TAMPERED outcome)

## Why this is a plan, not tests yet

`TAMPERED` is structurally unreachable from `verifyCertificate(bytes32 certificateHash)` alone —
documented honestly in the contract's own NatSpec since Week 9/10. Detecting tampering needs a
second, off-chain comparison: recompute the hash of a document someone actually has in hand, and
compare it against the ORIGINAL hash on file for the certificate NUMBER they claim it belongs to.
That comparison needs a document-upload endpoint, which doesn't exist yet (§5.5 / UX-OPEN-3 is
still open — see Keshav's Week 9 note on the identifier-only verifier portal). This plan is written
now so the moment upload exists, there's a concrete list of cases to implement against, not a
scramble to invent them.

## The comparison this needs

```
1. Caller uploads a document + claims certificate number N.
2. Look up N → get the ORIGINAL stored certificate_hash for N.
3. Recompute SHA-256 of the uploaded document.
4. If recomputed hash != stored hash  → TAMPERED.
   If recomputed hash == stored hash  → fall through to the normal VERIFIED/REVOKED/NOT_FOUND check.
```

Step 4's ordering matters: the hash comparison happens BEFORE the on-chain existence/revoked check,
because a hash mismatch means "this isn't the document I have on file for N" — you don't get to ask
whether the (wrong) document is verified or revoked; you get told the thing you uploaded doesn't
match what N is supposed to be.

## Test cases

| # | Case | Expected outcome | Why it matters |
|---|---|---|---|
| 1 | Upload the genuine, unmodified document for an active certificate | `VERIFIED` (falls through step 4) | Control case — proves the comparison doesn't false-positive on a legitimate document |
| 2 | Upload the genuine document for a certificate that's since been revoked | `REVOKED` (falls through step 4, then hits the revoked check) | Proves hash-match-then-status-check ordering doesn't mask a real revocation |
| 3 | Upload a document with a single byte changed (e.g. a grade digit edited) | `TAMPERED` | The core case — any content change changes the hash completely (SHA-256 avalanche effect), so this doesn't need to be a "big" edit to be caught |
| 4 | Re-export the genuine document from different software (e.g. print-to-PDF vs. the original generator) with visually identical content | `TAMPERED` | Real, easy-to-hit edge case: PDF re-export changes the underlying bytes (metadata, compression, font embedding) even when nothing visible changed — the check is byte-exact, not visual, and that's correct, but the copy shown to the user needs to explain this isn't necessarily malicious |
| 5 | Upload a completely different, unrelated document under someone else's certificate number | `TAMPERED` | Confirms the check doesn't accidentally match on partial/structural similarity — SHA-256 doesn't do fuzzy matching, but worth asserting explicitly since a naive "same file size" heuristic would fail this |
| 6 | Upload an empty (0-byte) file | `TAMPERED`, not a crash | Boundary case — the hash of an empty file is still a valid, well-defined SHA-256 value; it just won't match anything real |
| 7 | Upload a corrupted/truncated version of the genuine document | `TAMPERED` | Distinguishes "wrong hash" from "malformed file that fails to parse" — this must not throw a 500, it's just another hash mismatch |
| 8 | Claim a certificate number that doesn't exist at all, with any document | `NOT_FOUND` (step 2 fails before the hash comparison ever runs) | Confirms `NOT_FOUND` still takes priority over attempting a comparison against nothing |

## Open questions for whoever implements this (Sprint 4+)

1. Does the upload accept the original file type only (PDF), or should it normalize before
   hashing (e.g. strip metadata)? Case 4 above assumes NOT normalizing — worth confirming that's
   the intended UX before committing to it.
2. What's the max upload size, and what happens above it — reject before hashing, or hash and let
   it mismatch naturally?
3. Should the response distinguish "we couldn't even parse this as a document" from "we parsed it
   and the hash doesn't match"? This plan treats both as `TAMPERED` (case 6/7) for simplicity, but
   a more informative error might be worth it once real users hit this.
