# Monorepo Tooling - Workstream Spec

> Last updated: 2026-05-20
> Owner: Platform
> Parent: `../../OVERVIEW.md`
> Status: Draft - follow-up to pnpm conversion (PR #2069)

## Purpose

Clean up the rough edges left by the Yarn to pnpm conversion and introduce
build-graph orchestration with Turborepo.

This workstream has two durable goals:

1. Remove dependency-resolution workarounds that made the pnpm conversion
   mergeable but not yet strict.
2. Make repo-wide build, test, lint, and typecheck execution explicit,
   cached, and reproducible.

## How to Read This Spec

`SPEC.md` is the workstream map: themes, ordering, invariants, and backlog
ownership. PR execution details live in `plans/`.

Backlog IDs are preserved for tracking, but one ID does not always equal one
PR. Small chores are folded into a lead plan when they share the same files,
validation, and rollback path. Decision-only IDs stay in "Decisions Captured"
instead of the actionable backlog.

Create or keep a `plans/<ID>-<slug>.md` file when the work needs file paths,
multi-step gating, CI evidence, rollback criteria, or spans more than one
small config edit. Keep the detail inline only when the ID is explicitly
folded into a lead plan.

## Track Order

1. **Blur swap** - remove the duplicate React Native install symptom that
   forced temporary pnpm peer workarounds.
2. **Turbo foundation** - add the task graph locally before changing scripts
   or CI.
3. **pnpm config hardening** - migrate Yarn-era config to pnpm-native
   mechanisms and document install-script allowlists.
4. **Strictness and dedupe** - re-enable peer/subdependency checks and shrink
   duplicate dependency surfaces.
5. **CI/cache** - tune pnpm cache behavior after the local graph is stable.
6. **Circuits compatibility** - keep tests green under pnpm, then migrate off
   the temporary `circom_tester` fork pin.
7. **Isolated linker** - switch away from `nodeLinker: hoisted` only after
   patching, strictness, and RN gates are stable.

## Scope

### Blur Dependency Swap

`@selfxyz/euclid` is an external npm dependency, not a workspace package. The
`BlurView` implementation change happens upstream in Euclid, then this repo
bumps consumers and removes local test workarounds.

Chosen replacement: `@react-native-community/blur`, not `expo-blur`, because
`packages/mobile-sdk-demo` is a bare React Native app and should not pick up
Expo autolinking.

Fallback: if Euclid has not published the swap within two weeks of MT-1
kickoff, vendor a thin local `BlurView` wrapper in app surfaces and track the
eventual revert as a follow-up. Do not use `pnpm.patchedDependencies` for this
package swap.

### Turborepo

Add Turbo as local build orchestration first, then migrate root scripts, then
wire CI cache. Leaf workspace scripts remain the actual commands. Turbo owns
ordering, inputs, and outputs.

Every cacheable build task declares explicit `outputs`, and `globalDependencies`
cover shared root config such as root `tsconfig*`, `pnpm-lock.yaml`, and env
templates.

### pnpm Hardening

Move Yarn-era `resolutions` and `patch-package` behavior to pnpm-native
configuration. Re-enable strict peer and exotic-subdependency checks after the
known blockers are removed. Keep install-script allowlists justified in config.

### Circuits Compatibility

MT-21 pins `circom_tester` to the remicolin fork commit that exposes the
current string-list `getOutput(witness, string[])` API. MT-22 removes that pin
by migrating test code to upstream `circom_tester@0.0.24`.

The temporary fork pin is allowed only until the upstream API migration lands.

## Out of Scope

- React Native version alignment across `app`, `mobile-sdk-demo`, `rn-sdk`, and
  `rn-sdk-test-app`.
- Nx, Lerna, or any build orchestrator other than Turborepo.
- Remote Turbo cache. Local cache and CI filesystem cache only.
- Kotlin, Swift, Gradle, or SwiftPM build graph orchestration through Turbo.
- WebView bundle script ownership. MT-19 records that this belongs to
  `build-pipeline`, not this workstream.

## Invariants

- `@selfxyz/euclid` keeps the same `BlurView` public API. Consumers such as
  `TabBar`, `ViewFinder`, `RecoveryPhrase`, and `BlurContainer` must not need
  API changes.
- Root `package.json` scripts stay thin. Complex shell logic belongs in
  versioned Node scripts under `scripts/*.cjs`.
- Turbo is the single source of truth for JS workspace task ordering after
  MT-4. Root scripts must not reintroduce manual workspace build chains.
- Local `turbo run build` from a clean checkout must produce the same artifacts
  as the pre-Turbo `pnpm build`.
- Circuits tests must not import `circom_tester` APIs directly in a way that
  depends on hoisting choosing a transitive registry version.
- Every non-doc PR in this workstream must preserve the React Native app gate:
  `pnpm --filter @selfxyz/mobile-app test`, Android release build, iOS build
  after Pods install, and a wallet cold-start smoke.

## Dependencies

| Depends On                                        | Type     | Status  | Notes                                                                                                         |
| ------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| pnpm conversion (PR #2069)                        | Upstream | Landing | `packageManager: pnpm@11.1.1` already pinned; this work starts after merge.                                   |
| `@selfxyz/euclid`                                 | Upstream | Active  | Owns the `BlurView` implementation used by app consumers.                                                     |
| `@zk-email/relayer-utils` / `node-pre-gyp-github` | Override | Open    | Replaced by registry `node-pre-gyp-github@1.4.4` via `pnpm.overrides` in MT-6; no upstream wait required.     |
| `circom_tester` (remicolin fork)                  | Override | Open    | Last remaining `blockExoticSubdeps` blocker. Resolved by MT-22 upstream migration, or interim patch in MT-21. |

## Backlog Tracks

| Track                       | IDs                             | Status | Plan                                                                      | Notes                                                                                                |
| --------------------------- | ------------------------------- | ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Blur swap                   | MT-1, MT-2                      | Open   | [MT-1 Blur Swap](./plans/MT-1-blur-swap.md)                               | MT-1 is upstream Euclid work; MT-2 is local mock cleanup after the consumer bump.                    |
| Turbo foundation            | MT-3                            | Open   | [MT-3 Turbo Foundation](./plans/MT-3-turbo-foundation.md)                 | Add `turbo` and `turbo.json`; no root script or CI rewiring yet.                                     |
| Root script migration       | MT-4                            | Open   | [MT-4 Root Script Migration](./plans/MT-4-root-script-migration.md)       | Depends on MT-3.                                                                                     |
| CI Turbo migration          | MT-5                            | Open   | [MT-5 CI Turbo Migration](./plans/MT-5-ci-turbo-migration.md)             | Depends on MT-3 and MT-4.                                                                            |
| pnpm native config          | MT-6, MT-7, MT-10, MT-16, MT-17 | Open   | [MT-6 pnpm Config Hardening](./plans/MT-6-pnpm-config-hardening.md)       | One PR because overrides, patches, pnpm pin, and install-script allowlists share install validation. |
| Peer strictness             | MT-9, MT-11                     | Open   | [MT-9 Peer Strictness](./plans/MT-9-peer-strictness.md)                   | Re-enable `blockExoticSubdeps` and `strictPeerDependencies` together.                                |
| Yarn residue/docs           | MT-8, MT-15                     | Open   | [MT-8 Yarn Residue Guardrail](./plans/MT-8-yarn-residue-guardrail.md)     | Docs sweep plus guardrail against reintroducing Yarn artifacts.                                      |
| Dedupe audit                | MT-14, MT-18                    | Open   | [MT-14 Dedupe Audit](./plans/MT-14-dedupe-audit.md)                       | Inventory nested duplicates, run dedupe, and keep only intentional pins.                             |
| pnpm cache audit            | MT-13                           | Open   | [MT-13 pnpm Cache Audit](./plans/MT-13-pnpm-cache-audit.md)               | Tune `.github/actions/cache-pnpm`; do not cache `node_modules`.                                      |
| Circuits fork pin           | MT-21                           | Open   | [MT-21 Circom Tester Pin](./plans/MT-21-circom-tester-pin.md)             | Temporary stabilization under pnpm hoisting.                                                         |
| Circuits upstream migration | MT-22                           | Open   | [MT-22 Circom Tester Migration](./plans/MT-22-circom-tester-migration.md) | Removes the MT-21 pin by moving to upstream `0.0.24`.                                                |
| Isolated linker             | MT-12                           | Open   | [MT-12 Isolated Linker](./plans/MT-12-isolated-linker.md)                 | High-risk RN tooling change; depends on patch migration and preferably peer strictness.              |

- **MT-24:** `.github/CI_FORCE_RUN` sentinel and `scripts/ci/add-force-run-sentinel.py`
  are retained for the duration of the pnpm conversion PR (#2069). Rationale:
  the PR cannot necessarily be merged immediately and will be re-synced with
  `dev` repeatedly; each re-sync must re-validate the full workflow matrix to
  confirm the pnpm upgrade remains sound, but `check_changes` path gating
  otherwise skips workflows whose touched paths are unchanged. Bumping the
  sentinel forces every gated workflow to run. After #2069 merges, evaluate
  whether to keep the sentinel as general infra or remove it; no other current
  scenario requires it.

## Decisions Captured

- **MT-19:** Keep `scripts/build-webview-bundle.sh` outside Turbo in this
  workstream. Track any future integration under `build-pipeline` after owner
  sign-off.
- **MT-20:** Turbo cache correctness is required. Build tasks declare explicit
  `outputs`, and the pipeline declares `globalDependencies` for shared inputs.
- **MT-25:** `packages/rn-sdk-test-app` is pinned to `jest@^29.7.0` (not `^30`)
  because it uses `preset: react-native`, and RN 0.76's preset hard-requires
  `jest-environment-node@29` via `node_modules/react-native/jest/react-native-env.js`.
  Mixing jest-runtime@30 with the nested jest-mock@29 produces
  `this._moduleMocker.clearMocksOnScope is not a function` at test boot. Revisit
  when the RN upgrade lands (tracked in the separate RN upgrade branch); at that
  point realign to jest@30 across `app/` and `rn-sdk-test-app/`.
- **MT-26:** Removed the `app/web` react-native-web devtools preview
  (`.github/workflows/web.yml`, `app/web/`, `app/vite.config.ts`, all
  `app/src/**/*.web.*` companions, and the `vite` / `@vitejs/plugin-react-swc` /
  `@tamagui/vite-plugin` / `vite-plugin-svgr` / `rollup-plugin-visualizer` /
  `react-native-web` / `react-native-svg-web` / `react-qr-barcode-scanner` /
  `@types/react-native-web` deps plus the `web`, `web:build`, `web:preview`,
  `analyze:tree-shaking:web`, and `test:web-build` scripts). The preview had
  not actually run in CI for months — `Web CI` was path-gated and every recent
  PR run was `skipped` — and exposed multiple layers of pre-existing parse
  failures only because PR #2069's `CI_FORCE_RUN` sentinel forced it to
  execute. The upcoming "wrap webview-app inside the RN app" work uses
  `react-native-webview` to load `packages/webview-app`, so none of this
  machinery is needed for that path.

- **MT-23:** Closed without a backlog row. The original concern (root +
  `new-common/` `.prettierrc` forced `parser: "typescript"` globally, breaking
  non-TS file formatting) was fixed directly: parser line removed in both
  configs, and the now-redundant `--parser` flags in `scripts/format-root.cjs`
  and the `format:github` script dropped. `pnpm format` produces a clean diff;
  no repo-wide sweep is needed.

## Workstream Validation

Each plan carries its own validation commands. Before merging any non-doc PR in
this workstream, also run or produce CI evidence for:

```bash
pnpm install --frozen-lockfile
pnpm --filter @selfxyz/mobile-app test
pnpm types
pnpm build
```

RN-native build gates may be satisfied by CI artifacts when local iOS or
Android prerequisites are unavailable. Document any skipped local native gate in
the PR body with the CI job that covered it.
