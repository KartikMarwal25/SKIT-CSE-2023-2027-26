# Architecture documentation

- [`layers.md`](./layers.md) — the L1–L6 layered architecture, the ports-and-adapters boundary at
  L3/L4, and the dependency rules (D3–D5) that keep it real rather than aspirational.
- [`certificate-lifecycle.md`](./certificate-lifecycle.md) — the certificate's seven-state
  lifecycle model and its valid transitions.

See also:
- [`../adr/ADR-011-stack-choice.md`](../adr/ADR-011-stack-choice.md) — the technology stack
  decision this architecture is built on.
- [`../adr/ADR-008-worker-singleton.md`](../adr/ADR-008-worker-singleton.md) — why the worker
  runs as a single process.
- [`../adr/ADR-009-lifecycle-single-writer.md`](../adr/ADR-009-lifecycle-single-writer.md) — the
  full rationale behind dependency rule D5.
- [`../branching-strategy.md`](../branching-strategy.md) — repo/branching strategy.
