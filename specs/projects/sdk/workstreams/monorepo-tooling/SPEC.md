# Monorepo Tooling — Implementation Spec

> Last updated: 2026-05-13
> Owner: Platform
> Parent: `../../OVERVIEW.md`
> Status: Draft — follow-up to pnpm conversion (PR #2069)

## Parent-doc Alignment

`CLAUDE.md` and `AGENTS.md` (root + per-workspace) are already pnpm-first
as of this branch — the previous "Package manager: Yarn" rule has been
flipped to pnpm and all `yarn <cmd>` examples migrated to `pnpm <cmd>`
(or `pnpm --filter <workspace> <cmd>`). MT-8 retains coverage for any
additional doc sweeps as they surface.

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
in this one. The choices, in preferred order:

1. **Land the swap upstream in `@selfxyz/euclid`** and bump consumers here.
   This is the right home for the change and keeps the package's API
   surface consistent for other consumers. Owner needs to confirm Euclid
   release cadence.
2. **Vendor `BlurView` locally** if upstream cadence blocks us — create a
   thin wrapper in `app/src/components/BlurView.tsx` (and a parallel one
   in `mobile-sdk-demo` if needed) and stop importing
   `@selfxyz/euclid`'s `BlurView`. Adds duplication but unblocks us.
3. **Patch via `pnpm.patchedDependencies`** (see MT-7) as a stopgap.
   Lowest preference because the patch has to be maintained until upstream
   ships.

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

- Add `turbo` as a dev dep at the root and a `turbo.json` pipeline covering
  `build`, `test`, `lint`, `types`, `format`.
- Wire workspace task dependencies (e.g. `mobile-sdk-alpha#build` must run
  before `app#test` because jest resolves the built `dist/cjs`).
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

## Dependencies

| Depends On                | Type       | Status   | Notes                                                     |
| ------------------------- | ---------- | -------- | --------------------------------------------------------- |
| pnpm conversion (PR #2069) | Upstream   | Landing  | `packageManager: pnpm@11.1.1` already pinned; this spec runs after PR #2069 merges |
| `@selfxyz/euclid`         | Upstream   | Active   | Owns the `BlurView` API the swap rewrites                 |
| `expo` (already a dep)    | Upstream   | Active   | Provides `expo-blur`                                      |

## Validation

**Blur swap (MT-1, MT-2):**

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

## Backlog

| ID    | Title                                                | Status | Notes                                                                                                                |
| ----- | ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| MT-1  | Swap blur-effect → expo-blur in Euclid               | Open   | One file (`BlurView.tsx`) + dep cleanup                                                                              |
| MT-2  | Remove blur-effect jest mock                         | Open   | Depends on MT-1                                                                                                      |
| MT-3  | Add Turborepo + `turbo.json`                         | Open   | Define pipeline tasks and dependencies                                                                               |
| MT-4  | Migrate root scripts to `turbo run`                  | Open   | Depends on MT-3                                                                                                      |
| MT-5  | Wire CI workflows to `turbo run`                     | Open   | Depends on MT-4; preserve existing job boundaries                                                                    |
| MT-6  | Migrate `yarn` `resolutions` → `pnpm.overrides`      | Open   | Root `package.json` still has a `resolutions` block; pnpm ignores it. Move pins to `pnpm.overrides` so they apply.   |
| MT-7  | Migrate `patch-package` → `pnpm.patchedDependencies` | Open   | Root `postinstall` runs `patch-package`. pnpm has native patching that integrates with the store and lockfile.       |
| MT-8  | Update CLAUDE.md + workspace AGENTS.md for pnpm      | Open   | CLAUDE.md still says "Package manager: Yarn (never npm or pnpm)". Sweep docs for `yarn` commands.                    |
| MT-9  | Re-enable `blockExoticSubdeps`                       | Open   | Currently disabled for `@zk-email/relayer-utils` (pulls `node-pre-gyp-github` via git ref). Re-enable once upstream. |
| MT-10 | Audit and trim `allowBuilds` list                    | Open   | 17 entries today; some may not actually need install scripts. Verify each, drop the ones whose postinstall is a no-op. |
| MT-11 | Tighten `strictPeerDependencies` to `true`           | Open   | Currently `false` to land the conversion. Turn on, fix the warnings, lock it in.                                     |
| MT-12 | Replace `node-linker: hoisted` with isolated linker  | Open   | Hoisted defeats pnpm's main safety property. RN ≥0.71 autolinking + symlinks works; patches handled via MT-7. Big PR. |
| MT-13 | Audit `.github/actions/cache-pnpm` hit rate          | Open   | Store cache already exists (`.github/actions/cache-pnpm/action.yml`). Check actual hit rate, tune the `cache-version` bump cadence, and confirm no workflow still caches `node_modules`. |
| MT-14 | Sweep nested `node_modules/*/node_modules/*` dupes   | Open   | blur-effect was one. Likely more peer-resolution duplicates (every package with stale RN peer ranges). Inventory + fix.  |
| MT-15 | Verify all `.yarn*` artifacts are gone               | Open   | Confirm `.yarnrc.yml`, `.yarn/`, `yarn.lock`, and `yarn` references in scripts are fully removed; add a lint to block re-introduction. |
| MT-16 | Bump pnpm pin past `11.1.1`                          | Open   | Pinned via `packageManager`. Stay on a current minor; coordinate with Corepack rollout in CI.                        |
| MT-17 | Add `pnpm.onlyBuiltDependencies` allowlist comments  | Open   | Each entry in `allowBuilds` should have a one-line justification (what the script does, why it's safe).              |
| MT-18 | Verify dedupe of duplicate transitive versions       | Open   | Run `pnpm dedupe` and audit the diff. Lockfile is currently huge — pin where safe to shrink it.                      |

## Open Questions

- Should Turborepo also drive the WebView bundle script
  (`scripts/build-webview-bundle.sh`)? Probably yes via a `build:webview`
  task, but coordinate with the `build-pipeline` workstream owner first.
- Do we want `turbo.json` to declare `outputs` for the SDK package builds so
  cache invalidation is accurate? Default to yes.
