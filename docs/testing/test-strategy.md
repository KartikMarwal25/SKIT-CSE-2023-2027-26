# Contract Test Strategy

## Toolchain

- **Hardhat** — compilation, deployment, and the local built-in network.
- **Chai + Mocha** — assertion library and test runner (Hardhat's default pairing).
- **Ganache** — a second local blockchain option, run separately (`npm run ganache` inside
  `contracts/`, deterministic mode so every developer gets the same funded accounts), reachable
  from Hardhat via the `ganache` network entry in `hardhat.config.js`.

## Why both a built-in network and Ganache

Hardhat's own network is the default for `npm test` — fastest, zero setup. The separate Ganache
instance exists for scenarios where a persistent, inspectable chain across multiple terminal
sessions is more useful than a network that resets every test run (e.g. manually poking at
contract state with a wallet UI while developing). Both run the test suite identically; which one
a given `hardhat test --network <name>` run uses is just a flag.

## Issuance flow test plan (Week 3)

Kartik's Week 3 skeleton (`contracts/src/SecureCredRegistry.sol`) defines the surface this plan
tests against:

```solidity
function issueCertificate(bytes32 certificateHash, string calldata ipfsCid) external {
    // TODO(Week 4-6): access control, write to `certificates`, emit event.
}
```

The function body is a stub — nothing writes to the `certificates` mapping yet, no event fires,
and there is no access-control check. Nothing here is runnable against real assertions until that
TODO lands. This document is the **plan**: the concrete cases each of Kavish's Week 2
`it.skip` placeholders in `contracts/test/placeholder.issuance.test.js` will become once the write
path exists, organised under the three areas named in this week's task.

### 1. Valid issuance

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Call `issueCertificate(hash, cid)` with a fresh `hash` | Call does not revert |
| 2 | Read back `certificates(hash)` after issuance | Returns `certificateHash == hash`, `ipfsCid == cid`, `issuer == msg.sender`, `issuedAt == block.timestamp` |
| 3 | Read back `certificates(hash).status` after issuance | **Open question for Kartik** — the TODO doesn't yet say which `CertificateStatus` a fresh issuance starts in. Plan assumes `PENDING_STORAGE` (first enum value) pending confirmation. |
| 4 | Issuance event | **Open question** — no event is declared on the contract yet. Plan assumes a `CertificateIssued(bytes32 indexed certificateHash, address indexed issuer, string ipfsCid, uint256 issuedAt)` event once added; test asserts `.to.emit(registry, 'CertificateIssued').withArgs(...)`. |

### 2. Duplicate prevention

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Call `issueCertificate` twice with the same `certificateHash` | Second call reverts with the contract's own `CertificateAlreadyExists(certificateHash)` custom error (already declared on the Week 3 skeleton) |
| 2 | Call `issueCertificate` with two different hashes from the same caller | Both calls succeed independently; no cross-contamination between entries in the `certificates` mapping |

### 3. Access control

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Any address calls `issueCertificate` today (Week 3 stub) | **Known gap, not a bug to report** — the TODO explicitly defers access control to Week 4-6, so on the current skeleton this currently succeeds for any caller. Flagging this in the plan so it isn't mistaken for an oversight once real tests are written against the Week 3 code as-is. |
| 2 | Non-issuer address calls `issueCertificate` once access control lands | **Pending** — reverts with whatever error Kartik's Week 4-6 access-control design introduces (allowlist vs. role-based; not yet decided, see open question below) |

### Open questions for Kartik (blocking the real test file)

1. Initial `CertificateStatus` value for a freshly issued certificate.
2. Exact issuance event name/signature.
3. Access-control model (owner-managed issuer allowlist vs. role-based) — determines the revert
   error name the access-control test cases assert against.

## Next step

Once Kartik answers the above and the write path lands, `placeholder.issuance.test.js` gets
replaced case-by-case with real assertions against a deployed `SecureCredRegistry` — no case in
this plan should stay a placeholder past the week access control ships.
