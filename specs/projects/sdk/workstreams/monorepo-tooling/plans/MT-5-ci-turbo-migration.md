## Wire CI workflows to `turbo run`

> Last updated: 2026-05-13
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-5
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

CI is the highest-leverage place for Turbo's cache to pay off. With
local cache only (MT-3/MT-4 scope), CI still benefits from the task
graph and from `actions/cache` keyed on Turbo's hash. This plan swaps
`pnpm -r` invocations in CI for `turbo run` and adds a CI cache layer
for `.turbo/`.

### Dependencies

- **MT-3 and MT-4 must land first.** This plan assumes `turbo.json`
  exists and root scripts are already migrated.

### Scope

- For every CI workflow that runs `pnpm <build|lint|types|test|format>`
  or `pnpm -r --if-present <task>`, leave the script name unchanged
  (MT-4 already pointed those scripts at Turbo). The CI change is
  cache wiring, not invocation rewiring.
- Add a Turbo cache step using `actions/cache` keyed on
  `${{ hashFiles('pnpm-lock.yaml', 'turbo.json') }}` plus a workflow
  identifier. Cache path: `.turbo/`.
- Preserve existing job boundaries — do not consolidate or split jobs.
- Confirm `TURBO_TOKEN` / `TURBO_TEAM` env vars are **not** set
  (remote cache is out of scope; setting them silently would point at
  nothing).

### Out of Scope

- Remote build cache (Vercel-hosted or self-hosted).
- Job consolidation, splitting, or matrix changes.
- Replacement of the custom `cache-pnpm` action with
  `actions/setup-node` `cache: pnpm` — that is MT-13 territory.

### Validation

- A no-op push to `main` shows `actions/cache` hit on the `.turbo`
  key after at least one prior run on `main` populated it.
- Wall-clock time for a no-op change (e.g. README edit) on the
  full-build job is materially lower than the pre-Turbo baseline.
  Capture before/after numbers in the PR description.
- A real code change still invalidates the cache for the affected
  workspaces only — verify by inspecting Turbo's summary output in
  the CI log (`turbo run … --summarize`).
- RN regression gate: the iOS + Android release-build jobs still pass.

### Files Modified

| File                              | Change                                        |
| --------------------------------- | --------------------------------------------- |
| `.github/workflows/*.yml`         | Add `.turbo/` cache step; preserve job shape  |

### Files NOT Modified

- `turbo.json` (MT-3).
- Root `package.json` (MT-4).
- `.github/actions/cache-pnpm/action.yml` (MT-13).

### Rollback

If CI duration regresses or cache produces stale results, revert
the workflow changes only. `turbo.json` and root scripts remain in
place — local development is unaffected.

### Definition of Done

- [ ] Every workflow that builds or tests has a `.turbo/` cache step.
- [ ] `actions/cache` keys include both `pnpm-lock.yaml` and
      `turbo.json` hashes.
- [ ] No workflow leaks `TURBO_TOKEN` / `TURBO_TEAM` for remote cache.
- [ ] Wall-clock improvement on a no-op change is recorded in the PR.
- [ ] RN regression gate passes on iOS + Android jobs.

### Estimated PR Size

~100–300 LOC across workflow YAMLs depending on workflow count.

### Status Log

- 2026-05-13: Plan created.
