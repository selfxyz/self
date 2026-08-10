## Audit pnpm cache hit rate in CI

> Last updated: 2026-05-20
> Status: Archived 2026-08-06 - landed; hit-rate tuning dropped

- Workstream: monorepo-tooling
- Backlog IDs: MT-13
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

The repo has a shared `.github/actions/cache-pnpm` composite action. This plan
checks whether it is effective, prevents direct `node_modules` caching, and
chooses one pnpm cache strategy so workflows do not drift.

### Scope

- Inspect workflows that install dependencies and confirm they use the shared
  `cache-pnpm` action.
- Measure cache hit rate on `main` over a one-week sample.
- Tune `cache-version` cadence if hit rate is below target.
- Decide whether this repo standardizes on `cache-pnpm` or
  `actions/setup-node` with `cache: pnpm`; document the choice and update
  workflows for consistency.
- Confirm no workflow caches `node_modules`.

### Out of Scope

- Turbo cache wiring; MT-5 owns `.turbo/` cache.
- Dependency installation behavior changes.
- Remote Turbo cache.

### Validation

```bash
rg -n "cache-pnpm|setup-node|node_modules|actions/cache" .github/workflows .github/actions
```

Evidence to collect:

- One-week `main` sample showing at least 80% hits for the pnpm store cache.
- Workflow diff showing no `node_modules` cache paths.
- PR note describing the chosen cache strategy.

### Files Modified

| File                                    | Change                                       |
| --------------------------------------- | -------------------------------------------- |
| `.github/workflows/*.yml`               | Normalize pnpm cache usage and remove drift. |
| `.github/actions/cache-pnpm/action.yml` | Tune cache key/version only if needed.       |

### Rollback

If hit rate falls below 80% on `main` after the change, revert the cache-key
tuning and reopen MT-13 with the observed workflows and miss reasons.

### Definition of Done

- [ ] Workflows use one pnpm cache strategy consistently.
- [ ] No workflow caches `node_modules`.
- [ ] Cache hit-rate evidence is recorded in the PR.
- [ ] Rollback condition is documented.
