## Pin-aware cross-workspace dependency upgrade sweep (`ncu`)

> Last updated: 2026-06-22
> Status: Archived 2026-08-06 - landed via #2236

- Workstream: monorepo-tooling
- Backlog IDs: MT-29
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

The Yarn→pnpm migration froze dependency versions; nothing systematically
bumps them since the repo has no `dependabot`/`renovate` and no `ncu` tooling.
Drift accumulates silently and makes future security patches and the RN
upgrade harder. This plan introduces a **repeatable, pin-aware** upgrade pass
using `npm-check-updates` (`ncu`) across all JS workspaces, scoped so the
lockfile diff stays reviewable and the repo's intentional pins are never
clobbered.

This is dependency-version cleanup, deliberately separated from `pnpm dedupe`
(MT-14) and from major framework upgrades (RN/Expo).

### Dependencies

- **MT-6 must be landed** (it is) — patch/override migration is complete, so
  `ncu` operates against a stable override set.
- Coordinate ordering with **MT-14** (dedupe): run MT-29 _before_ MT-14 so the
  dedupe audit reflects the upgraded versions, or sequence them in the same
  window. Do not interleave their PRs — each must land with its own clean
  lockfile diff.
- Do **not** run during an MT-9 strictness flip; upgrades and a peer-check flip
  in the same PR make regressions impossible to bisect.

### Decisions

- **Tool:** `ncu` invoked as `pnpm dlx npm-check-updates@17` (not added as a
  repo dependency — it is an operator tool, run on demand). Pin the major so
  the command is stable across runs; **the PR body must record the exact
  resolved version** (`ncu --version`) so the pass is reproducible. Scan all
  workspace manifests with `--deep --packageManager pnpm`.
- **First pass is patch + minor only** (`--target minor`). Majors are handled
  one package at a time in separate follow-up PRs, never in the sweep.
- **Reject list is mandatory.** Two categories, both passed as one flat,
  repo-wide `--reject` glob (the sweep does not run per-workspace, so every
  reject below is global by construction):
  - _Override pins_ (changing these fights an `overrides` entry):
    - `jsdom` — pinned `^25` (MT-27; v26 breaks react-dom tests).
    - `@types/minimatch` — pinned `5.1.2` (MT-28; v6 is a broken stub).
    - `circom_tester` — github fork pin (MT-21). Still present in the tree
      until MT-22 removes it, so this sweep must reject it to avoid bumping the
      fork pin in the interim; once MT-22 lands this entry can be dropped.
  - _Policy defers_ (no override pin, but owned by another track / too
    entangled for a routine sweep):
    - `react-native`, `react-native-*`, `expo`, `expo-*`, `react`, `react-dom`
      — owned by the app workspace. The RN upgrade track is closed; see
      [OVERVIEW.md](../../projects/sdk/OVERVIEW.md) for the live toolchain
      state and `../rn-upgrade/RN-UPGRADE-PLAN.md` for the archived plan.
      Current state: RN `0.83.9`, React `19.2.0`, Expo `55.0.20`, uniform
      across workspaces. These move only as a coordinated major on that track,
      gated on Expo SDK progression (SDK 55 → RN 0.83; SDK 56 not GA).
    - `jest`, `jest-*`, `@types/jest` — **rejected globally, intentionally.**
      `packages/rn-sdk-test-app` is pinned to jest `^29` by the RN preset
      (MT-25), and jest's version is entangled with the RN preset across
      `app/` too. A flat reject freezes jest everywhere for this sweep;
      targeted jest realignment is out of scope and tracked under MT-25.
- **Lockfile-size guard.** If the resulting `pnpm-lock.yaml` diff exceeds ~3k
  changed lines, split the sweep into grouped PRs by workspace cluster — (a)
  SDK packages (`common`, `packages/mobile-sdk-alpha`, `packages/webview-*`,
  `packages/*-sdk*`, `sdk/*`), (b) `app/`, (c) `contracts`/`circuits` — and
  land them sequentially. Record the split in the Status Log.

### Scope

1. Run `pnpm dlx npm-check-updates@17 --deep --packageManager pnpm
--target minor --reject "<reject-globs>"` to preview drift; capture the
   output and the resolved `ncu --version` in the PR body.
2. Apply with the same command plus `-u`, then `pnpm install` to refresh
   `pnpm-lock.yaml`.
3. Review the manifest + lockfile diff package-by-package. Drop any bump that
   touches a rejected package. Transitive majors pulled in within allowed
   semver ranges are expected; review them and call out (or revert) any
   runtime/high-risk transitive major in the PR body.
4. Run the full workstream validation (below) and fix or revert individual
   bumps that break it — never relax a pin to make an upgrade pass.
5. Document the exact `ncu` command (with the reject list) in the PR body so
   the pass is reproducible next quarter.

### Out of Scope

- Major version bumps (separate per-package PRs).
- RN / Expo / React upgrades (RN upgrade track).
- `pnpm dedupe` and nested-duplicate cleanup (MT-14).
- Adding `dependabot`/`renovate` automation — evaluate only after one manual
  sweep proves the reject list and validation gates are correct.
- Removing or relaxing any intentional pin/override.

### Validation

```bash
pnpm install --frozen-lockfile
pnpm --filter @selfxyz/mobile-app test
pnpm types
pnpm build
pnpm --filter @selfxyz/mobile-sdk-alpha test
pnpm --filter @selfxyz/mobile-sdk-alpha types
pnpm --filter @selfxyz/webview-bridge build
pnpm --filter @selfxyz/webview-bridge test
pnpm --filter @selfxyz/webview-app build
```

RN-native build gates (iOS after Pods install, Android release build, wallet
cold-start smoke) may be satisfied by CI artifacts; document any skipped local
native gate with the covering CI job, per the workstream invariant.

### Files Modified

| File                               | Change                                           |
| ---------------------------------- | ------------------------------------------------ |
| Workspace `package.json` manifests | Patch/minor version bumps for non-rejected deps. |
| `pnpm-lock.yaml`                   | Regenerated by `pnpm install` after the bumps.   |

### Files NOT Modified

- `pnpm-workspace.yaml` `overrides` block (intentional pins — see reject list).
- Any manifest entry for a rejected package.

### Rollback

Revert the manifest + lockfile changes; the repo returns to pre-sweep
versions. No runtime config or tooling is added, so rollback is a single
revert with no follow-on cleanup.

### Definition of Done

- [ ] `ncu --target minor` (with the reject list) reports no further
      non-rejected drift after the sweep.
- [ ] No rejected package or `overrides` entry changed version.
- [ ] Transitive major changes are reviewed; any runtime/high-risk transitive
      major is called out in the PR body or reverted.
- [ ] Full workstream validation passes (or CI evidence is linked for native
      gates).
- [ ] The exact reproducible `ncu` command **and resolved `ncu --version`** are
      recorded in the PR body.

### Estimated PR Size

Lockfile-dominated; ~500–3k changed lines depending on drift. Split per the
lockfile-size guard if it exceeds the upper bound.

### Status Log

- 2026-06-22: Plan created. No `ncu`/automation exists today; first pass is a
  manual, pin-aware patch+minor sweep separated from MT-14 dedupe and the RN
  upgrade track.
- 2026-06-22: Review fixes — pinned `ncu@17` + record resolved version
  (reproducibility); corrected stale RN rationale (repo is on RN `0.83.9` /
  React `19.2.0` / Expo `55.0.20`, not the old `0.76.9`/`0.77.0` mix); split
  reject list into override-pins vs policy-defers and made the global jest
  reject explicit; fixed `cd`-chaining in validation (root `--filter`
  invocations); relaxed the "no transitive major" gate to "reviewed / called
  out or reverted".
- 2026-08-06: Landed as #2236 (`30021c979`). **Departure from this plan,
  accepted retroactively:** the sweep changed 3,560 `pnpm-lock.yaml` lines
  (1,600 insertions / 1,960 deletions), above the ~3k upper bound that required
  splitting per the lockfile-size guard, and shipped unsplit. Reviewed as one
  PR because the churn is lockfile-dominated peer re-threading from a single
  coherent sweep, not independent chunks. No `ncu --version` / reproducible
  command was recorded in the PR body — that DoD item was not met. Archived
  as completed with these gaps noted rather than reopened.
