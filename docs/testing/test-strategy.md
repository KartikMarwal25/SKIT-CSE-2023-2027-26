# Contract Test Strategy — Week 1 Setup

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

## What's tested this week

Nothing real yet — there is no contract to test until Kartik's skeleton lands in Week 3. This
week's `test/toolchain.smoke.test.js` exists solely to prove the pipeline (compile → deploy →
call → assert) works end to end against both networks, using a throwaway placeholder contract
(`src/_ToolchainSmokeTest.sol`). Both files are deleted once real contract tests replace them.

## Plan from Week 3 onward

Once the certificate contract skeleton exists, this document gets replaced with the actual test
plan for the issuance flow (valid issuance, duplicate prevention, access control) — that's
explicitly this week's *next* task, not this week's.
