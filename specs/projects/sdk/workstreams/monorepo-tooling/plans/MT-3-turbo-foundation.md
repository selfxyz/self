## Add Turborepo + `turbo.json`

> Last updated: 2026-05-13
> Status: Draft

- Workstream: monorepo-tooling
- Backlog IDs: MT-3
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

Cross-workspace builds currently fan out via `pnpm -r --if-present`,
which has no awareness of task graph or input/output hashing. Adding
Turborepo gives us per-task caching, explicit cross-workspace
dependencies (e.g. `mobile-sdk-alpha#build` must run before `app#test`
because jest resolves the built `dist/cjs`), and a single source of
truth for ordering.

This plan only introduces Turbo and `turbo.json`. It does not change
root scripts (MT-4) or CI workflows (MT-5).

### Scope

- Add `turbo` as a root dev dependency, pinned to a current `^2.x`
  minor.
- Add `turbo.json` at repo root with task definitions for `build`,
  `test`, `lint`, `types`, `format`.
- Declare per-task `dependsOn`, `inputs`, and `outputs` (MT-20 decision
  — these are required, not optional).
- Declare `globalDependencies` covering at minimum root `tsconfig*`,
  `pnpm-lock.yaml`, and env templates.
- Add `.turbo/` to `.gitignore` if not already present.

### Out of Scope

- Migrating root `package.json` scripts to call `turbo run` (MT-4).
- CI workflow changes (MT-5).
- Remote cache configuration (deferred).
- Removing `pnpm -r` invocations from anywhere else in the repo.
- Wiring `scripts/build-webview-bundle.sh` into Turbo (MT-19 decision —
  belongs to `build-pipeline`).

### Decisions Encoded

- **Outputs are required.** Every task that produces files declares
  them in `outputs`. Examples: SDK packages emit `dist/**`,
  `webview-app` emits `dist/**`, type-check tasks emit nothing.
  Without `outputs`, cache hits are wrong and cache misses are
  silent.
- **Globals are explicit.** `globalDependencies` lists root config
  that invalidates every task on change. Anything missing here causes
  stale cache bugs that are very hard to debug.
- **Leaf scripts unchanged.** Per-workspace `package.json` scripts
  remain the source of truth for the actual command. Turbo only
  orchestrates.

### Task Graph

| Task     | `dependsOn` | Typical outputs               |
| -------- | ----------- | ----------------------------- |
| `build`  | `^build`    | `dist/**`                     |
| `test`   | `^build`    | (none — cache by inputs only) |
| `types`  | `^build`    | (none)                        |
| `lint`   | (none)      | (none)                        |
| `format` | (none)      | (none)                        |

`^build` means "the `build` task of every workspace dependency."

Workspace-specific override needed at least for:

- `app#test`: `dependsOn: ["@selfxyz/mobile-sdk-alpha#build"]` so jest
  resolves the built `dist/cjs` output rather than the TS source.

### Validation

```bash
# From clean checkout
pnpm install --frozen-lockfile

# Cold build hits no cache
pnpm exec turbo run build --summarize

# Second run is cached
pnpm exec turbo run build --summarize
# Confirm "FULL TURBO" in summary

# Tasks defined for every workspace that needs them
pnpm exec turbo run lint types test --dry-run=json | jq '.tasks | length'

# Outputs caught
pnpm exec turbo run build
ls packages/mobile-sdk-alpha/dist
ls packages/webview-app/dist
```

### Files Created

| File         | Purpose             |
| ------------ | ------------------- |
| `turbo.json` | Pipeline definition |

### Files Modified

| File           | Change                           |
| -------------- | -------------------------------- |
| `package.json` | Add `turbo` to `devDependencies` |
| `.gitignore`   | Add `.turbo/` if absent          |

### Files NOT Modified

- Per-workspace `package.json` scripts — leaf commands unchanged.
- Root `package.json` script entries — MT-4 owns these.
- Any `.github/workflows/*.yml` — MT-5 owns CI wiring.

### Definition of Done

- [ ] `turbo` installed at repo root, pinned to `^2.x`.
- [ ] `turbo.json` defines `build`, `test`, `lint`, `types`, `format`.
- [ ] Every build task declares `outputs`.
- [ ] `globalDependencies` covers root tsconfig, lockfile, env templates.
- [ ] `app#test` depends on `@selfxyz/mobile-sdk-alpha#build`.
- [ ] Cold `turbo run build` succeeds.
- [ ] Warm `turbo run build` reports "FULL TURBO" / 100% cache hits.
- [ ] No regression in `pnpm --filter @selfxyz/mobile-app test`.

### Estimated PR Size

~150 LOC. Small.

### Status Log

- 2026-05-13: Plan created.
