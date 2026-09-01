# Certificate Lifecycle State Model

A certificate moves through exactly seven states from issuance request to its terminal outcome.
Every transition is written by `lifecycleService` and nowhere else (rule D5 — see
`docs/architecture/layers.md`), so this document and the code that enforces it can never drift
apart without a review catching it.

## The seven states

| State | Meaning |
|---|---|
| `PENDING_STORAGE` | Issuance request accepted; the certificate document is being generated and pinned to IPFS. Nothing has been written on-chain yet. |
| `PENDING_ANCHOR` | The document is stored (its CID is known); waiting to broadcast the on-chain anchor transaction. |
| `ANCHORING` | The anchor transaction has been broadcast; waiting for enough block confirmations to consider it final. |
| `ACTIVE` | Anchored and confirmed. The certificate is real, public, and verifiable. |
| `REVOKING` | An issuer has requested revocation; the revoke transaction has been broadcast and is waiting for confirmation. |
| `REVOKED` | Revocation confirmed on-chain. Permanent — there is no transition back to `ACTIVE` (see [Permanence](#permanence-of-revocation)). |
| `FAILED` | Issuance could not complete (storage or anchoring failed after retries). No certificate was ever made public; nothing partial is left visible. |

## Valid transitions

```
PENDING_STORAGE --(document stored)--> PENDING_ANCHOR
PENDING_STORAGE --(storage failed)---> FAILED

PENDING_ANCHOR  --(anchor tx sent)---> ANCHORING
PENDING_ANCHOR  --(anchor tx failed)-> FAILED

ANCHORING       --(confirmed)--------> ACTIVE
ANCHORING       --(failed after retry)-> FAILED

ACTIVE          --(revoke requested)-> REVOKING

REVOKING        --(confirmed)--------> REVOKED
```

`FAILED` and `REVOKED` are terminal — no transition leaves either state. `ACTIVE` is the only
non-terminal state reachable from a successful issuance, and `REVOKING`/`REVOKED` are the only
states reachable *from* `ACTIVE`.

## Why `FAILED` exists as its own state (not just "delete the row")

A failed issuance is never silently discarded. The row stays, in `FAILED`, so the institution
that attempted the issuance can see it failed and why — but nothing about a `FAILED` certificate
is ever shown to a public verifier, since it was never actually issued in any sense a third party
should see.

## Permanence of revocation

There is no code path anywhere in this system that moves a certificate out of `REVOKED`. This is
enforced by omission, not by a guard that could later be bypassed: the set of valid transitions
above is the complete set `lifecycleService` implements, and `REVOKED` simply isn't a source state
in that set. A "reinstated" certificate would need to be issued again, as a new certificate with
its own identity — the original revoked one stays revoked.

## See also

- `docs/architecture/layers.md` — rule D5, the single-writer invariant this model depends on.
