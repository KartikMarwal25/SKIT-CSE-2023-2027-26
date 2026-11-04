# Polygon Amoy deployment — readiness checklist

Deployment *scripts* and *configuration* are ready this week (`hardhat.config.js`'s `amoy` network
entry, `scripts/deploy.js`'s custodian-registration step, `npm run deploy:amoy`). An actual
transaction on Amoy has **not** happened yet — this doc tracks the gap between "the tooling is
ready" and "we've actually deployed," so it's obvious what's still needed rather than left
ambiguous.

## What's needed before a real `npm run deploy:amoy` can run

1. **A funded custodian wallet.** Amoy is a testnet — its POL has no real value, but a wallet
   still needs *some* testnet POL to pay gas, from a faucet (e.g. the official Polygon faucet).
   Nothing in this repo has a real, funded testnet private key yet.
2. **An RPC endpoint.** The public `https://rpc-amoy.polygon.technology` (the config's fallback)
   is rate-limited and not reliable enough for a real deployment — a proper deployment should use
   a dedicated provider (Alchemy, Infura, or similar) via `AMOY_RPC_URL`.
3. **`CUSTODIAN_PRIVATE_KEY`** set in the repo-root `.env` — the wallet from step 1.
4. **Decide `CUSTODIAN_ADDRESS`** — whether the deployer wallet itself should also be the first
   registered issuer (the deploy script supports this via `CUSTODIAN_ADDRESS`, but it's an
   explicit choice, not automatic).

## What this week's scripts do NOT yet handle

- **Contract verification on Polygonscan** — no `polygonscan-verify` step exists yet; once a real
  deployment happens, the deployed bytecode should be verified so anyone can read the source
  against what's actually on-chain.
- **Gas price strategy** — `hardhat.config.js`'s `amoy` entry uses Hardhat's default gas
  estimation; Amoy's gas market can spike, and a real deployment might want an explicit
  `maxFeePerGas`/`maxPriorityFeePerGas` rather than trusting auto-estimation on the first try.

## Verified this week (without needing real funds)

- `npx hardhat compile` — the `amoy` network entry doesn't require any secrets to be set for
  compilation to succeed (the accounts array is empty when `CUSTODIAN_PRIVATE_KEY` is unset).
- `npx hardhat test` — unaffected; the `amoy` network isn't the one tests run against.
- The `deploy.js` script's custodian-registration logic is exercised locally against Ganache
  (`CUSTODIAN_ADDRESS=<a Ganache account> npm run deploy:ganache`) to confirm the new step works
  before it's ever run against a real network.
