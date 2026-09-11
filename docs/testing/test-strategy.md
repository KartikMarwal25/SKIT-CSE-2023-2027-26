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

## Issuance flow test plan

Kartik's Week 5 contract (`contracts/src/SecureCredRegistry.sol`) now actually writes to the
`certificates` mapping and emits an event, so this plan's "1. Valid issuance" section is real as of
this week — see `contracts/test/placeholder.issuance.test.js`.

### 1. Valid issuance — DONE (Week 5)

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Call `issueCertificate(hash, cid)` with a fresh `hash` | Call does not revert |
| 2 | Read back `certificates(hash)` after issuance | Returns `certificateHash == hash`, `ipfsCid == cid`, `issuer == msg.sender`, `issuedAt == block.timestamp` |
| 3 | Read back `certificates(hash).status` after issuance | **Resolved** — starts at `PENDING_STORAGE` (enum index 0), confirmed by Kartik's Week 5 implementation. |
| 4 | Issuance event | **Resolved** — `CertificateIssued(bytes32 indexed certificateHash, address indexed issuer, string ipfsCid, uint256 issuedAt)`, confirmed by Kartik's Week 5 implementation. |

### 2. Duplicate prevention — still a placeholder

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Call `issueCertificate` twice with the same `certificateHash` | Second call reverts with the contract's own `CertificateAlreadyExists(certificateHash)` custom error |
| 2 | Call `issueCertificate` with two different hashes from the same caller | Both calls succeed independently; no cross-contamination between entries in the `certificates` mapping |

The revert path is actually implemented on the Week 5 contract now too, so these cases could become
real tests — deliberately left as placeholders this week since the task was scoped to hash/CID
storage and event-emission checks only, not duplicate prevention.

### 3. Access control — still a placeholder

| # | Case | Expected behaviour |
|---|---|---|
| 1 | Any address calls `issueCertificate` today | **Known gap, not a bug to report** — access control is a Week 6 task. |
| 2 | Non-issuer address calls `issueCertificate` once access control lands | **Pending** — reverts with whatever error Kartik's Week 6 access-control design introduces (allowlist vs. role-based; not yet decided). |

## Next step

Week 6: once Kartik adds issuer-only access control, convert "2. Duplicate prevention" and
"3. Access control" into real tests the same way "1. Valid issuance" was converted this week.

## Week 5 verification

`npx hardhat test` against the full contracts suite: 5 passing (4 new issuance tests + the Week 1
toolchain smoke test), 4 pending (the still-placeholder duplicate-prevention/access-control cases).
No regressions.
