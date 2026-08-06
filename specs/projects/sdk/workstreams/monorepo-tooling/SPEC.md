# Monorepo Tooling - Workstream Spec

> Last updated: 2026-08-06
> Owner: Platform
> Parent: `../../OVERVIEW.md`
> Status: Active, narrow - pnpm cutover and Turbo foundation are done. Live
> remainder is one chain (MT-22 → MT-9) plus three small tracks.

The yarn→pnpm migration itself is finished and its goals were met; see
[pnpm migration status](../../../../../docs/pnpm-migration-status.md), which is
authoritative for that question. What remains here is hardening that the
cutover deferred, not migration work.

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

Steps 1-3 and 5 are done (see "Completed"); step 7 is a won't-do (see
"Decisions Captured"). The live order is:

1. ~~Blur swap~~ - partially done; only the `react-native-blur-effect` removal
   remains, and the duplicate-RN symptom it targeted is already neutralized.
2. ~~Turbo foundation~~ - done (#2186/#2188).
3. ~~pnpm config hardening~~ - done (MT-6).
4. **Circuits compatibility** - migrate off the `circom_tester` fork pin
   (MT-22). This now leads, because it gates step 6.
5. ~~CI/cache~~ - done (MT-13); MT-5 is finishing KMP lint coverage and CI
   evidence.
6. **Strictness and dedupe** - measure and enable `strictPeerDependencies`
   (MT-9) independently of step 4; re-enable `blockExoticSubdeps` once step 4
   lands. Then shrink duplicate surfaces (MT-14).
7. ~~Isolated linker~~ - won't do; hoisting is required by RN autolinking.

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
templates. (As implemented in MT-3, the repo has no root `tsconfig*` or env
template, so `globalDependencies` is `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`.npmrc`.)

**Implemented in MT-3/MT-4 — read before MT-5 (CI):**

- Per-task exclusions live in `scripts/turbo-tasks.cjs` (Turbo has no per-task
  package-exclude in `turbo.json`); root scripts call
  `node scripts/turbo-tasks.cjs <task>`.
- Gradle/native packages (`@selfxyz/kmp-sdk`, `@selfxyz/kmp-sdk-test-app`) are
  excluded from every Turbo task (SPEC keeps gradle/swift out of Turbo). As a
  result `pnpm test` and `pnpm lint` no longer cover the kmp packages — they are
  covered by the dedicated `kmp:test`/`kmp:lint` (and `native-shell:*`) scripts.
  **MT-5 must invoke kmp/native coverage explicitly**, not via bare `pnpm test`/
  `pnpm lint`. Tests are satisfied as of 2026-08-06: `kmp-ci.yml` runs
  `:shared:jvmTest`, `:shared:iosSimulatorArm64Test`, and
  `:composeApp:testDebugUnitTest` directly via Gradle. **Lint is not.**
  `scripts/turbo-tasks.cjs` excludes `@selfxyz/kmp-sdk` and
  `@selfxyz/kmp-sdk-test-app` from the root `lint` task, both packages define
  `lint` as `./gradlew ktlintCheck` (plus SwiftLint for the test app), and
  `kmp-ci.yml` invokes no lint step — `native-shells-ci.yml` runs `ktlintCheck`
  only for the native-shell directories. MT-5 stays open until `kmp-ci.yml`
  invokes `ktlintCheck` for both packages.
- `pnpm format` stays on `scripts/format-monorepo.cjs` (bespoke gradle/swift +
  env orchestration); it is not migrated to `turbo run format`.

### pnpm Hardening

Move Yarn-era `resolutions` and `patch-package` behavior to pnpm-native
configuration. Re-enable strict peer and exotic-subdependency checks after the
known blockers are removed. Keep install-script allowlists justified in config.

### Circuits Compatibility

MT-21 (landed) pins `circom_tester` to the remicolin fork commit that exposes
the current string-list `getOutput(witness, string[])` API. MT-22 removes that
pin by migrating test code to upstream `circom_tester@0.0.24`.

The temporary fork pin is allowed only until the upstream API migration lands.
It is the single blocker for MT-9's `blockExoticSubdeps` half, so MT-22 leads
this workstream. Circuits is separately owned — read the notes at the top of the
MT-22 plan first.

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

| Depends On                                        | Type     | Status   | Notes                                                                                                                                      |
| ------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| pnpm conversion (PR #2069)                        | Upstream | Landed   | Merged. Root pin has since moved to `pnpm@11.12.0`; read the current value from root `package.json`, not from this table.                  |
| `@selfxyz/euclid`                                 | Upstream | Active   | Owns the `BlurView` implementation used by app consumers. App and `mobile-sdk-alpha` are on `^0.6.1` (the 0.x RN lineage, not 1.x web).    |
| `@zk-email/relayer-utils` / `node-pre-gyp-github` | Override | Resolved | Replaced by registry `node-pre-gyp-github@1.4.4` via `overrides`. No longer a `blockExoticSubdeps` blocker.                                |
| `circom_tester` (remicolin fork)                  | Override | Open     | **The only remaining `blockExoticSubdeps` blocker.** Resolved by MT-22. Circuits-owned; see the note in the MT-22 plan before touching it. |

## Backlog Tracks

Verified against the repo on 2026-08-06. Landed and won't-do tracks moved to
"Completed" and "Decisions Captured"; their plans are in
`specs/archive/monorepo-tooling/`.

| Track                       | IDs          | Status      | Plan                                                                      | Notes                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------ | ----------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circuits upstream migration | MT-22        | Open        | [MT-22 Circom Tester Migration](./plans/MT-22-circom-tester-migration.md) | **Gates the `blockExoticSubdeps` half of MT-9** — the `github:` ref is why that flag is off. `strictPeerDependencies` is a separate axis. Circuits-owned.                                                                                                                                                                               |
| Peer strictness             | MT-9, MT-11  | Partial     | [MT-9 Peer Strictness](./plans/MT-9-peer-strictness.md)                   | Split blockers: `blockExoticSubdeps: false` is gated on MT-22 (`circom_tester` `github:` ref); `strictPeerDependencies: false` has no confirmed blocker and needs its failure list measured. `node-pre-gyp-github` is resolved.                                                                                                         |
| CI Turbo migration          | MT-5         | In progress | [MT-5 CI Turbo Migration](./plans/MT-5-ci-turbo-migration.md)             | `cache-turbo` composite and `turbo run` are live across 5 workflows. Remaining: the missing KMP lint invocation (`kmp-ci.yml` runs no `ktlintCheck`) plus DoD evidence — recorded wall-clock delta, cache-key audit, RN gate.                                                                                                           |
| Blur swap                   | MT-1, MT-2   | Partial     | [MT-1 Blur Swap](./plans/MT-1-blur-swap.md)                               | `@react-native-community/blur` is in `app/`, but `react-native-blur-effect` is still declared in 5 files plus the Jest mock. Symptom neutralized, cleanup not done — see the note below the table.                                                                                                                                      |
| Dedupe audit                | MT-14, MT-18 | Open        | [MT-14 Dedupe Audit](./plans/MT-14-dedupe-audit.md)                       | Inventory nested duplicates, run dedupe, keep only intentional pins. Lowest priority here.                                                                                                                                                                                                                                              |
| Yarn residue guardrail      | MT-8, MT-15  | Partial     | [MT-8 Yarn Residue Guardrail](./plans/MT-8-yarn-residue-guardrail.md)     | Lockfile/config artifacts removed in #2069. Remaining: (a) the narrative docs pass — `app/README.md` and `app/docs/MOBILE_DEPLOYMENT.md` still show `yarn` commands; (b) a guardrail that fails if yarn artifacts return. This repo uses **husky** (`.husky/`), not lefthook — lefthook is not installed, despite earlier wording here. |

**MT-1/MT-2 current state (verified 2026-08-06).** `react-native-blur-effect` is
still declared in `app/package.json`, `packages/mobile-sdk-alpha/package.json`,
`packages/mobile-sdk-demo/package.json`, `pnpm-workspace.yaml` (both the
`overrides` pin and the `@selfxyz/euclid` peer-optional `packageExtensions`
block), and `app/jest.config.cjs`, plus `app/tests/__setup__/blurEffectMock.js`.
The original symptom — a nested duplicate `react-native` — is **not** present:
the lockfile resolves `react-native-blur-effect@1.1.3` against the same
`react-native@0.83.9` as the rest of the workspace, held there by the `1.1.3`
override. So the goal is met by configuration while the removal in MT-1's scope
is outstanding. Anyone dropping that override must re-check for the nested copy.

- **MT-24: resolved 2026-08-06 — keep the sentinel as general infra.**
  `.github/CI_FORCE_RUN` and `scripts/ci/add-force-run-sentinel.py` were
  introduced so each re-sync of the pnpm conversion PR (#2069) could force the
  full workflow matrix past `check_changes` path gating. The open question was
  whether to keep them after that merge. Keep: the sentinel has since become
  general infra — it documents four reuse cases beyond the migration, is listed
  in the `paths:` filters or `check_changes` allowlists of 10+ workflows, and
  `pnpm lint:ci-sentinel` enforces that coverage on every lint run. Removing it
  would mean editing every one of those workflows to no benefit.

## Completed

Treat everything below as done. Plans are archived in
`specs/archive/monorepo-tooling/` with rows in `specs/ARCHIVE.md`. Do not
re-implement these as part of a remaining track.

- **MT-3 / MT-4 — Turbo foundation and root script migration.** `turbo` +
  `turbo.json` landed in #2186; root scripts route through
  `scripts/turbo-tasks.cjs` (#2186/#2188). Per-task package exclusions live in
  that script because `turbo.json` has no per-task package-exclude. Gradle/native
  packages are excluded from every Turbo task, so `pnpm test` / `pnpm lint` do not
  cover them — `kmp-ci.yml` covers kmp directly via Gradle (`:shared:jvmTest`,
  `:shared:iosSimulatorArm64Test`, `:composeApp:testDebugUnitTest`).
- **MT-6 — pnpm native config.** Complete. `patchedDependencies` consolidated to
  6 pnpm-native patches, `allowBuilds` allowlist audited 2026-06-17 with per-entry
  rationale inline, pnpm pin enforced by `scripts/check-pnpm-version.mjs`.
- **MT-13 — pnpm cache.** `cache-pnpm` adopted across workflows;
  `cache-mobile-sdk-build` / `cache-core-sdk-build` no longer cache
  `node_modules`, which fixed the 20-minute `pnpm exec` hang on lint. The residual
  "hit-rate tuning" scope is dropped as not worth tracking; reopen with a specific
  measurement if cache misses become a real cost.
- **MT-21 — circom_tester fork pin.** Landed. `pnpm-workspace.yaml` overrides pin
  the fork at sha `81e963ce`. MT-22 removes it.
- **MT-29 — version sweep.** Landed via #2236 (`chore/upgrade-pkgs-rd3`).

### Foundations landed in PR #2069

- **MT-6 foundations:** `packageManager: pnpm@11.5.3` pinned; pnpm-native
  `allowBuilds` install-script allowlist in `pnpm-workspace.yaml`;
  `scripts/check-pnpm-version.mjs` enforces the pin locally and in CI;
  `pnpm.overrides` block established (`jsdom@^25.0.1`, `@types/minimatch@5.1.2`,
  `circom_tester` fork pin). MT-6 has since finished this scope: patches
  consolidated to pnpm `patchedDependencies`, the install-script allowlist
  audited and justified, and the pnpm pin bumped `11.5.3` → `11.7.0`.
- **MT-8 foundations:** `yarn.lock`, `.yarnrc.yml`, and
  `.github/actions/yarnrc-hash` deleted; every workspace `package.json`,
  `CLAUDE.md`, `AGENTS.md`, and root script migrated to pnpm; new
  `.github/actions/pnpm-install` composite replaces `yarn-install`. Remaining
  MT-8 scope is the husky/CI guardrail that fails if yarn artifacts return
  (lefthook is not installed; see the MT-8 row above).
- **MT-13 foundations:** `.github/actions/cache-pnpm` (pnpm store cache)
  created and adopted across workflows; `cache-mobile-sdk-build` and
  `cache-core-sdk-build` no longer cache `node_modules` (only `dist/`), which
  resolved the 20-minute `pnpm exec` hang on lint. Closed 2026-08-06 — residual
  hit-rate tuning dropped as unmeasured. The `.turbo/` layer (`cache-turbo`,
  #2190) is MT-5 scope, not MT-13.

## Decisions Captured

- **MT-12: won't do.** Do not migrate off `nodeLinker: hoisted` to pnpm's
  isolated linker. React Native autolinking requires a flat `node_modules`, so
  hoisting is load-bearing rather than a leftover conversion workaround, and
  `pnpm-workspace.yaml` documents it as such. The strictness value MT-12 was
  meant to unlock is better pursued through MT-9 (peer/exotic-subdep checks),
  which does not require changing the linker. Reopen only if RN's autolinking
  gains real isolated-linker support.

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
- **MT-27:** `pnpm.overrides` pins `jsdom@^25.0.1` workspace-wide. Rationale:
  jsdom v26 swapped `cssstyle` to v5, whose strict `Proxy` rejects react-dom
  v18's numeric-index style writes with
  `TypeError: 'set' on proxy: trap returned falsish`. This blocks any test
  using `@testing-library/react` or React 18 SSR against jsdom v26. The pin
  must stay until the workspace lands on react-dom v19 (or jsdom v26 relaxes
  the proxy trap). MT-9 (strict peers) should not treat this as a violation;
  it is an intentional override with an external blocker.

- **MT-28:** `pnpm.overrides` pins `@types/minimatch@5.1.2`. Rationale: v6 is
  a deprecated stub shipping no `.d.ts` files, which causes `TS2688: Cannot
find type definition file for 'minimatch'` whenever the `@types` directory
  is auto-scanned (e.g. `ng-packagr` in `sdk/qrcode-angular`). Remove when no
  workspace depends on a transitive `@types/minimatch` consumer or when the
  upstream stub is retracted.

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
