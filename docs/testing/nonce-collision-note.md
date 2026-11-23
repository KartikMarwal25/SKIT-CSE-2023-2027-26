# Nonce-collision note

While verifying earlier weeks' contract changes against a real local Ganache instance, re-running a
deploy/test script against an already-running (not freshly restarted) Ganache instance produced:

```
the tx doesn't have the correct nonce. account has nonce of: 4 tx has nonce of: 3
```

Root cause: the second script run constructed a fresh `ethers.Wallet` for the same account and
sent a transaction assuming nonce 3 (its own internal count, starting from zero), while the actual
chain — still holding state from the *first* run — was already at nonce 4 for that account. Nothing
was wrong with the contract or the adapter; two independent processes each assumed they alone knew
"the next nonce" for that account, and they disagreed.

Fixed operationally each time by restarting Ganache fresh before a verification run (deterministic
mode resets nonces to zero), not by changing any code. Recorded here because it's the concrete,
already-observed version of exactly the failure mode
`docs/architecture/worker-event-listener-spec.md`'s singleton section is designed to prevent for
the custodian wallet in production — two things sending transactions from one account without
coordination.
