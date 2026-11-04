# chain.adapter.js — the L3/L4 blockchain port

`chain.adapter.js` is the one boundary between this codebase's plain JS and the contract's ABI
(rule D4 — `docs/architecture/layers.md`). Everything above it (services, routes) depends on this
shape, never on `ethers` or the ABI directly.

## The port's shape

```js
createChainAdapter({ network, signer }) => {
  issueCertificate(certificateHash, ipfsCid) => Promise<{ txHash }>
  verifyCertificate(certificateHash) => Promise<'VERIFIED'|'REVOKED'|'TAMPERED'|'NOT_FOUND'>
  revokeCertificate(certificateHash, reason) => Promise<{ txHash }>
}
```

Plus three standalone connection helpers used only by the composition root
(`container.js`) to avoid importing `ethers` anywhere else:

```js
createProvider(rpcUrl) => ethers.JsonRpcProvider
createWallet(privateKey, provider) => ethers.Wallet
createRandomWallet(provider) => ethers.Wallet   // dev-only fallback, unfunded
```

## Why this shape, specifically

- **Strings and plain objects in, strings and plain objects out.** No `ethers` types (no
  `BigNumberish`, no `TransactionResponse`) ever cross this boundary — `verifyCertificate` returns
  a plain string outcome name, not the raw `uint8` the contract actually returns, so nothing above
  this file needs to know the enum's on-chain integer ordering.
- **Errors are already mapped.** `revokeCertificate`'s custom-error decoding (`NotIssuer` →
  `E_FORBIDDEN`, etc. — see chain.adapter.js's `REVOKE_ERROR_MAP`) happens inside the adapter, so a
  route just does `next(err)` — it never needs to know this system is backed by a smart contract at
  all, only that failures arrive as `AppError`s from the shared catalogue.
- **The deployment record (`contracts/deployments/<network>.json`) is the only place the address
  and ABI live.** Nothing hardcodes either — swapping networks (Ganache → Amoy, once that's real)
  is a config change (`CHAIN_NETWORK`), not a code change.

## What's deliberately NOT part of this port yet

- **No confirmation tracking.** `issueCertificate`/`revokeCertificate` return as soon as the
  transaction is broadcast, not once it's mined — that's the worker's job, and no worker exists in
  this build yet.
- **No batching / multicall.** Every call is its own transaction.
- **No gas price strategy.** Whatever `ethers`/the network estimates by default.

Each of those is a real, deliberate scope boundary, not an oversight — extending this port to cover
any of them is Sprint 4+ work, once there's a concrete caller that actually needs it.
