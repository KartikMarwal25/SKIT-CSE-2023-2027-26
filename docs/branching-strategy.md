# Repository & Branching Strategy

## Branches

- `main` — always deployable. Every merge into it comes from a review, never a direct push.
- One branch per team member, named `<firstname>/<short-description>` (e.g.
  `jaideep/week-02-db-schema`). A member's branch is theirs to commit to freely through the week;
  it exists to make in-progress work visible, not to gate every commit behind review.

## Weekly cadence

Each member merges their branch into `main` once per week, at the end of the week their task
covers. Before merging:

1. `git pull --rebase origin main` on the member's branch, resolving any conflicts locally.
2. `git push origin <branch-name>`.
3. Open a PR into `main`; at least one other team member reviews it before merge.

This matches the weekly GitHub-report workflow (Form-3): the report is generated from real commit
history on `main` every Thursday night, so a branch that never gets merged never shows up in that
week's report. Committing every day, but merging weekly, is deliberate — it keeps the daily commit
history honest (real incremental work, not a single end-of-week squash) while keeping `main`
stable between merges.

## Commit messages

Conventional-commit style: `<type>(<scope>): <message>` — `feat`, `fix`, `docs`, `chore`, `test`,
`refactor`. `<scope>` is the app/package touched (`api`, `web`, `contracts`, `db`, `architecture`,
etc.). This is what the weekly Form-3 report groups commits by, so a consistent scope matters for
that report being readable, not just for the git log.

## What doesn't merge without review

Anything touching `lifecycleService` (the only module permitted to write `certificate.status` —
see ADR-009) or the smart contract's state-changing functions gets a second reviewer regardless of
how small the change looks, given how much of the system's correctness depends on both staying
exactly as narrow as they are.
