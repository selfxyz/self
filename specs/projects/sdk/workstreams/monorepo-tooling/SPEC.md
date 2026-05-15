# Monorepo Tooling — Implementation Spec

> Last updated: 2026-05-13
> Owner: Platform
> Parent: `../../OVERVIEW.md`
> Status: Draft — follow-up to pnpm conversion (PR #2069)

## Parent-doc Alignment

`CLAUDE.md` and `AGENTS.md` (root + per-workspace) are already pnpm-first
as of this branch. MT-8 owns any residual doc sweep + a guardrail to
block reintroduction of `yarn` commands.

## Purpose

Clean up the rough edges left by the Yarn → pnpm conversion and introduce
build-graph orchestration (Turborepo). Two threads:

1. Replace `react-native-blur-effect` so pnpm peer-resolution stops nesting a
   duplicate `react-native` install.
2. Add Turborepo to drive build / test / lint / types across workspaces with
   caching, replacing the current `pnpm -r --if-present` fan-out.

## Scope

### 1. Blur dependency swap

`@selfxyz/euclid` is **not** a workspace package — it is an external npm
dependency (`^0.6.1` in `app` and `mobile-sdk-alpha`, `1.4.2` in
`webview-app`). The swap therefore happens upstream in the Euclid repo, not
in this one.

**Decision — land the swap upstream in `@selfxyz/euclid` and bump
consumers here.** This keeps the `BlurView` API surface consistent for
other Euclid consumers and avoids carrying a local divergence. Fallback:
if Euclid release cadence has not produced a published version within
**two weeks of MT-1 kickoff**, vendor a thin `BlurView` wrapper in
`app/` (and `mobile-sdk-demo` if needed) and stop importing
`@selfxyz/euclid`'s `BlurView`; track the eventual revert as a follow-up.
`pnpm.patchedDependencies` is **not** a chosen path — patches on a
published npm package are too easy to drift from upstream.

Replacement library — **`@react-native-community/blur`** (not `expo-blur`).
Reason: `mobile-sdk-demo` is a bare RN app with **no Expo dependency**
(`packages/mobile-sdk-demo/package.json`), and pulling in `expo-blur`
forces `expo-modules-core` autolinking on a non-Expo app. The community
package peers `react-native >=0.57`, has no Expo coupling, and exposes the
same `BlurView` API on iOS and Android. Web keeps the existing
`backdrop-filter` CSS branch.

Cleanup steps (applies regardless of which path above is chosen):

- Remove `react-native-blur-effect` from `app/package.json`,
  `packages/mobile-sdk-demo/package.json`, and the root `resolutions`
  block in `package.json`.
- Drop the `@selfxyz/euclid` `peerDependenciesMeta` workaround in
  `pnpm-workspace.yaml`.
- Remove the temporary jest mock added in this branch:
  `app/tests/__setup__/blurEffectMock.js` and its `moduleNameMapper` entry
  in `app/jest.config.cjs`.

### 2. Turborepo

- Add `turbo` as a dev dep at the root (pin to a current `^2.x` minor;
  match across CI and local) and a `turbo.json` pipeline covering
  `build`, `test`, `lint`, `types`, `format`.
- Wire workspace task dependencies (e.g. `mobile-sdk-alpha#build` must run
  before `app#test` because jest resolves the built `dist/cjs`).
- Per MT-20, every build task declares explicit `outputs`; the pipeline
  declares `globalDependencies` for shared root config (at minimum root
  `tsconfig*`, `pnpm-lock.yaml`, env templates). Cache correctness is a
  required property of the pipeline, not an optimization.
- Migrate root scripts in `package.json`:
  - `build` → `turbo run build`
  - `lint` → `turbo run lint`
  - `types` → `turbo run types`
  - `test` → `turbo run test`
- Keep the existing per-workspace scripts as the leaf tasks; Turbo only
  orchestrates.
- Configure remote cache later (out of scope here — local cache first).

## Out of Scope

- Aligning React Native versions across workspaces (`app: 0.77.0` vs
  `mobile-sdk-demo / rn-sdk / rn-sdk-test-app: 0.76.9`). Tracked separately;
  the blur swap removes the only test-blocking symptom.
- Nx, Lerna, or any orchestrator other than Turborepo.
- Remote build cache (Vercel / self-hosted). Local cache only for v1.
- Changes to CI workflows beyond swapping `pnpm -r` for `turbo run` calls.
- Kotlin / Swift build graph (Gradle + SPM stay as-is; Turbo only manages JS).

## Invariants

- `@selfxyz/euclid` keeps the same `BlurView` public API. Consumers
  (`TabBar`, `ViewFinder`, `RecoveryPhrase`, `BlurContainer`) must not need
  changes.
- pnpm-workspace.yaml stops needing the `react-native-blur-effect`
  optional-peer hack once the dependency is gone.
- Turbo task graph is the single source of truth for cross-workspace
  ordering. No more `pnpm --filter X build && pnpm --filter Y build`
  chains in root scripts.
- Local `turbo run build` from a clean checkout must produce the same
  artifacts as today's `pnpm build`.
- Root `package.json` scripts stay as thin orchestration wrappers. Complex
  shell logic (conditionals, retries, long chained commands, heavy quoting /
  globbing) must live in versioned Node tooling scripts under `scripts/*.cjs`.
  The script entry in `package.json` should be a single command invoking that
  script (for example, `node scripts/<name>.cjs`).
- Circuits tests must import `wasm`/`c` from
  `circuits/tests/utils/circomTesterCompat.ts`, not directly from
  `circom_tester`, until upstream guarantees stable `getOutput(...)` behavior
  across the tested circuit set.

## Dependencies

| Depends On                 | Type     | Status  | Notes                                                                              |
| -------------------------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| pnpm conversion (PR #2069) | Upstream | Landing | `packageManager: pnpm@11.1.1` already pinned; this spec runs after PR #2069 merges |
| `@selfxyz/euclid`          | Upstream | Active  | Owns the `BlurView` API the swap rewrites                                          |

## Validation

**Blur swap (MT-1, MT-2):**

MT-1 ships in the `@selfxyz/euclid` repo and is validated there. The
checks below run **in this repo** against the consumer bump that pulls in
the new Euclid version (and against MT-2 directly):

- `pnpm install` from a clean checkout produces no nested
  `node_modules/react-native-blur-effect/node_modules/react-native`.
- `pnpm --filter @selfxyz/mobile-app test` passes without the
  `blurEffectMock.js` workaround.
- Visual smoke: open the wallet app and confirm blur renders on the tab
  bar, recovery-phrase reveal, and document scan viewfinder.
- `mobile-sdk-demo` still builds for iOS + Android without an Expo
  dependency.

**Turborepo (MT-3, MT-4, MT-5):**

- `turbo run build` and `turbo run test` succeed cold; second run hits the
  Turbo cache (verify with `turbo run … --summarize`).
- CI wall-clock time on a no-op change is materially lower than the
  pre-Turbo baseline.

**pnpm config (MT-6, MT-7, MT-9, MT-10, MT-11, MT-17):**

- `pnpm overrides` matches the previous `resolutions` set; `pnpm why` for
  each pinned package confirms the override applied.
- `pnpm install` succeeds with `pnpm.patchedDependencies` replacing the
  `patch-package` postinstall — and the postinstall hook is gone from root
  `package.json`.
- `pnpm install` succeeds with `strictPeerDependencies: true` and
  `blockExoticSubdeps: true`.
- Every `allowBuilds` entry has a one-line justification comment.

**Circom tester compatibility (MT-21):**

- `pnpm --filter @selfxyz/circuits test` passes in CI with
  `circom_tester` pinned to the current upstream Git ref (no forced downgrade
  to older npm-only versions).
- `circuits/tests/utils/circomTesterCompat.ts` is the single compatibility
  boundary. No ad-hoc `getOutput` shims duplicated across tests.
- A follow-up can remove the compat import only after proving direct imports
  from `circom_tester` pass consistently in Circuits CI.

**Linker change (MT-12):**

- Switching off `nodeLinker: hoisted` (to default isolated), the
  RN Android + iOS builds, jest suite, and `pnpm build` all pass.

**CI cache (MT-13):**

- `actions/cache` hit-rate report on the `cache-pnpm` key shows ≥80% hits
  on `main` over a one-week sample. No workflow caches `node_modules`.

**Cleanup (MT-14, MT-15, MT-16, MT-18):**

- `find node_modules -mindepth 2 -name node_modules -type d` lists no
  RN-adjacent nested duplicates after dedupe.
- `rg -i '\byarn\b' --glob '!pnpm-lock.yaml' --glob '!CHANGELOG*'` returns
  only intentional historical references; no `.yarnrc*`, `.yarn/`, or
  `yarn.lock` present.
- `packageManager` is pinned to a current pnpm release; Corepack in CI
  resolves it without warning.
- `pnpm dedupe --check` exits clean.

**Docs (MT-8):**

- `CLAUDE.md`, root `AGENTS.md`, and the workspace-specific `AGENTS.md`
  files all reference `pnpm` (not `yarn`) for setup, lint, test, build.

**Cross-cutting RN regression gate (applies to every MT-X PR):**

Per CLAUDE.md "No regressions in the RN app," every PR in this workstream
must, before merge, pass: `pnpm --filter @selfxyz/mobile-app test`, a
release-mode Android build, an iOS build via the standard Pods install,
and a manual cold-start smoke of the wallet app. PRs that only touch
docs or `turbo.json` `outputs` declarations are exempt.

## Backlog

| ID    | Title                                                        | Status | Notes                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MT-1  | Swap blur-effect → @react-native-community/blur in Euclid    | Open   | One file (`BlurView.tsx`) + dep cleanup                                                                                                                                                                                                                                                                                                                  |
| MT-2  | Remove blur-effect jest mock                                 | Open   | Depends on MT-1                                                                                                                                                                                                                                                                                                                                          |
| MT-3  | Add Turborepo + `turbo.json`                                 | Open   | Define pipeline tasks and dependencies                                                                                                                                                                                                                                                                                                                   |
| MT-4  | Migrate root scripts to `turbo run`                          | Open   | Depends on MT-3                                                                                                                                                                                                                                                                                                                                          |
| MT-5  | Wire CI workflows to `turbo run`                             | Open   | Depends on MT-4; preserve existing job boundaries                                                                                                                                                                                                                                                                                                        |
| MT-6  | Migrate `yarn` `resolutions` → `pnpm.overrides`              | Open   | Root `package.json` still has a `resolutions` block; pnpm ignores it. Move pins to `pnpm.overrides` so they apply.                                                                                                                                                                                                                                       |
| MT-7  | Migrate `patch-package` → `pnpm.patchedDependencies`         | Open   | Root `postinstall` runs `patch-package`. pnpm has native patching that integrates with the store and lockfile.                                                                                                                                                                                                                                           |
| MT-8  | Final pnpm docs sweep + guardrail check                      | Open   | CLAUDE.md and AGENTS docs are pnpm-first now; keep a follow-up sweep for stale `yarn` references and add a guardrail to prevent reintroduction.                                                                                                                                                                                                          |
| MT-9  | Re-enable `blockExoticSubdeps`                               | Open   | Currently disabled for `@zk-email/relayer-utils` (pulls `node-pre-gyp-github` via git ref). Re-enable once upstream.                                                                                                                                                                                                                                     |
| MT-10 | Audit and trim `allowBuilds` list                            | Open   | 17 entries today; some may not actually need install scripts. Verify each, drop the ones whose postinstall is a no-op.                                                                                                                                                                                                                                   |
| MT-11 | Tighten `strictPeerDependencies` to `true`                   | Open   | Currently `false` to land the conversion. Turn on, fix the warnings, lock it in.                                                                                                                                                                                                                                                                         |
| MT-12 | Replace `node-linker: hoisted` with isolated linker          | Open   | High-risk tooling switch — gated on its own plan: [MT-12 Isolated Linker](./plans/MT-12-isolated-linker.md). Per-gate acceptance for Metro, Watchman, Pods, Hermes/codegen, Gradle autolinking, plus rollback criteria. Depends on MT-7.                                                                                                                 |
| MT-13 | Audit `.github/actions/cache-pnpm` hit rate                  | Open   | Store cache exists (`.github/actions/cache-pnpm/action.yml`). Check hit rate, tune `cache-version` cadence, confirm no workflow caches `node_modules`. Also decide between the custom action and `actions/setup-node` with `cache: pnpm` — pick one to avoid drift. Define rollback action if hit rate falls below 80% on `main` over a one-week sample. |
| MT-14 | Sweep nested `node_modules/*/node_modules/*` dupes           | Open   | blur-effect was one. Likely more peer-resolution duplicates (every package with stale RN peer ranges). Inventory + fix.                                                                                                                                                                                                                                  |
| MT-15 | Verify all `.yarn*` artifacts are gone                       | Open   | Confirm `.yarnrc.yml`, `.yarn/`, `yarn.lock`, and `yarn` references in scripts are fully removed; add a lint to block re-introduction.                                                                                                                                                                                                                   |
| MT-16 | Bump pnpm pin past `11.1.1`                                  | Open   | Pinned via `packageManager`. Stay on a current minor; coordinate with Corepack rollout in CI.                                                                                                                                                                                                                                                            |
| MT-17 | Add `pnpm.onlyBuiltDependencies` allowlist comments          | Open   | Each entry in `allowBuilds` should have a one-line justification (what the script does, why it's safe).                                                                                                                                                                                                                                                  |
| MT-18 | Verify dedupe of duplicate transitive versions               | Open   | Run `pnpm dedupe` and audit the diff. Lockfile is currently huge — pin where safe to shrink it.                                                                                                                                                                                                                                                          |
| MT-19 | Keep WebView bundle script outside Turbo in this workstream  | Open   | Decision: do not wire `scripts/build-webview-bundle.sh` into `turbo.json` here. Track integration under `build-pipeline` as a separate follow-up after owner sign-off.                                                                                                                                                                                   |
| MT-20 | Declare Turbo cache contract for build outputs + inputs      | Open   | Decision: define explicit `outputs` for build tasks and set `globalDependencies` for shared config files (at minimum root tsconfig + lockfile + env templates) in `turbo.json`.                                                                                                                                                                          |
| MT-21 | Normalize `circom_tester` compat boundary for circuits tests | Open   | Keep current upstream `circom_tester` and route test imports through `circomTesterCompat` until upstream `getOutput` behavior is stable. Remove shim only with CI proof.                                                                                                                                                                                 |

## Decisions Captured

- `MT-19` resolves WebView bundling scope for this workstream: keep it out of
  Turbo for now and hand off to `build-pipeline`.
- `MT-20` resolves Turbo cache correctness: task outputs and
  `globalDependencies` are required, not optional.
