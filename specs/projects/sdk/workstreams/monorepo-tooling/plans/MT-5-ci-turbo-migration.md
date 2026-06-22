## Wire CI workflows to `turbo run`

> Last updated: 2026-06-22
> Status: In progress

- Workstream: monorepo-tooling
- Backlog IDs: MT-5
- Owner: Justin Hernandez
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

**Inventory correction (2026-06-22).** The original plan assumed most CI
workflows already invoke the root `pnpm <build|test|lint|types>` scripts that
MT-4 pointed at Turbo, so "cache wiring only" would cover the repo. Auditing
the workflows showed otherwise: most run `pnpm --filter <pkg> <task>` (or the
same script under a `working-directory: ./app`/`./contracts` override), which
hits the **package-local** script and bypasses Turbo entirely — no task graph,
no cache. A `.turbo/` cache on those is a no-op. The only workflow that runs
the Turbo-fronted root scripts at repo root is `workspace-ci`.

So MT-5 splits into two moves:

1. **Cache-only** — `workspace-ci` (all 5 jobs) and `common-ci`'s
   `type-check` job. These run `pnpm build`/`types`/`lint` at repo root
   through Turbo. Add a `.turbo/` cache step; no invocation change. (Turbo
   caches no-`outputs` tasks like `types` by hash and replays/skips them on a
   hit, so the cache still pays off even though `types` produces no artifact.)
2. **Rewire + cache** — `webview-app-ci`, `webview-bridge-ci`, and the
   `types` job of `rn-sdk-test-app-ci`. These hand-roll a `pnpm --filter
   common build` → `mobile-sdk-alpha` → `webview-bridge` (→ `webview-app`)
   chain before the leaf task, rebuilding all dependencies from scratch every
   run. `turbo.json`'s `^build` graph already models that chain, so the chain
   collapses to one cached invocation:
   - build jobs: `pnpm exec turbo run build --filter="<leaf>"` (leaf + deps).
   - lint/types/test jobs: `pnpm exec turbo run build --filter="<leaf>^..."`
     (dependencies only), then the unchanged leaf `pnpm --filter <leaf>
     <task>`. Verified by `turbo run … --dry=json` that each filter resolves
     to exactly the package set the manual steps built.

**Explicitly left alone** (not Turbo-routed, would be a behavior change or a
broad rewrite the scope rejects):

- `mobile-ci` — `pnpm lint`/`fmt`/`types` run under `working-directory: ./app`
  (app-local scripts) with its own `cache-built-deps` action.
- `contracts.yml` — `pnpm build`/`test` run under `working-directory:
  ./contracts` (hardhat); `test` is `if: false`.
- `common-ci` — only the `type-check` job is in scope (its root `pnpm types`
  routes through Turbo; cache added). The `build`, `lint`, and `test-common`
  jobs use `pnpm --filter` package-local scripts plus a bespoke `common/dist`
  + `mobile-sdk-alpha/dist` cache, and stay as-is.
- `rn-sdk-test-app-ci` `ios-build` job — builds `mobile-sdk-alpha` via
  `build:ios` / `build:ts-only`, which are not Turbo tasks.

**Cache wiring.** A new composite action `.github/actions/cache-turbo`
(input: `key-prefix`) wraps `actions/cache@v4` so the 8-line block is not
duplicated across jobs. Cache path: `.turbo`. Key:
`turbo-<key-prefix>-${{ hashFiles('pnpm-lock.yaml', 'turbo.json') }}-${{ github.sha }}`
with a `restore-keys` prefix dropping the sha. **Deviation from the original
key:** the plan's literal `hashFiles(...)`-only key is immutable —
`actions/cache` never overwrites an existing key, so it would freeze Turbo's
cache at the first run's state and incremental hits would stop improving. The
`github.sha` suffix + `restore-keys` prefix is the canonical Turbo-on-Actions
pattern: each run saves a fresh entry and restores the most recent prefix
match.

- Preserve existing job boundaries — do not consolidate or split jobs.
- Confirm `TURBO_TOKEN` / `TURBO_TEAM` env vars are **not** set
  (remote cache is out of scope; setting them silently would point at
  nothing). Verified absent across `.github/`.

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

| File                                          | Change                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `.github/actions/cache-turbo/action.yml`      | New composite action wrapping `actions/cache` for `.turbo`              |
| `.github/workflows/workspace-ci.yml`          | Cache step in build/type-check/lint/format-check/test jobs (cache-only) |
| `.github/workflows/common-ci.yml`             | Cache step in the `type-check` job (`pnpm types` is Turbo-routed)       |
| `.github/workflows/webview-app-ci.yml`        | Rewire `--filter` chain → `turbo run build`; add cache                  |
| `.github/workflows/webview-bridge-ci.yml`     | Rewire `--filter` chain → `turbo run build`; add cache                  |
| `.github/workflows/rn-sdk-test-app-ci.yml`    | Rewire `types` job build chain → `turbo run build`; add cache           |

### Files NOT Modified

- `turbo.json` (MT-3).
- Root `package.json` (MT-4).
- `.github/actions/cache-pnpm/action.yml` (MT-13).
- `mobile-ci.yml`, `contracts.yml` (not Turbo-routed — see Scope).
- `common-ci.yml` build/lint/test jobs (package-local; only `type-check` is in scope).

### Rollback

If CI duration regresses or cache produces stale results, revert
the workflow changes only. `turbo.json` and root scripts remain in
place — local development is unaffected.

### Definition of Done

- [ ] Every in-scope Turbo-routed workflow/job has a `.turbo/` cache step
      (`workspace-ci` all jobs, `common-ci` type-check, `webview-app-ci`,
      `webview-bridge-ci`, `rn-sdk-test-app-ci` types job). Workflows that are
      not Turbo-routed are intentionally excluded: `mobile-ci`, `contracts`,
      `common-ci` build/lint/test, and `rn-sdk-test-app-ci` ios-build.
- [ ] `actions/cache` keys include both `pnpm-lock.yaml` and
      `turbo.json` hashes.
- [ ] No workflow leaks `TURBO_TOKEN` / `TURBO_TEAM` for remote cache.
- [ ] Wall-clock improvement on a no-op change is recorded in the PR.
- [ ] RN regression gate passes on iOS + Android jobs.

### Estimated PR Size

~100–300 LOC across workflow YAMLs depending on workflow count.

### Status Log

- 2026-05-13: Plan created.
- 2026-06-22: Implemented. Inventory audit reframed scope to cache-only
  (`workspace-ci`) + rewire-and-cache (`webview-app-ci`, `webview-bridge-ci`,
  `rn-sdk-test-app-ci` types job); added `cache-turbo` composite action;
  corrected the immutable cache key to sha-suffixed + restore-keys. Turbo
  filter resolution verified via `--dry=json`. Pending: capture CI
  before/after wall-clock numbers and confirm `.turbo` cache hit on a
  follow-up run for the PR body.
