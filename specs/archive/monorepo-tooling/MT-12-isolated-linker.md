## Replace `node-linker: hoisted` with pnpm's isolated linker

> Last updated: 2026-05-13
> Status: Archived 2026-08-06 - WON'T DO; RN autolinking requires hoisted

- Workstream: monorepo-tooling
- Backlog IDs: MT-12
- Owner: TBD
- Branch: TBD
- PR: TBD

### Why

`pnpm-workspace.yaml` currently sets `nodeLinker: hoisted` to survive the
Yarn → pnpm conversion. Hoisting defeats pnpm's main safety property
(strict, isolated `node_modules` per package) — every workspace can
silently import any transitive dep, peer mismatches go undetected, and
ghost dependencies creep in. Until this is flipped to the default
isolated (symlink-based) linker, MT-9 and MT-14 cannot deliver
their full safety value.

This plan is high-risk because React Native's tooling chain was not
designed for a symlinked `node_modules`. Each gate below must pass on
its own before the next is touched; do not bundle them into one
implementation step.

### Scope

- `pnpm-workspace.yaml` — remove `nodeLinker: hoisted` (or set explicitly
  to `isolated`).
- `.npmrc` — remove the duplicate `node-linker=hoisted` line. The linker is
  currently pinned in **both** files; flipping only `pnpm-workspace.yaml`
  leaves `.npmrc` forcing the hoisted layout, so the install layout would not
  actually change.
- Any `.npmrc` flags required to make RN tooling work under isolated
  (e.g. `public-hoist-pattern`, `shamefully-hoist=false`,
  `dedupe-peer-dependents=true`). Document each addition with a one-line
  comment.
- Metro / Watchman / Pods / Hermes / Gradle configuration changes
  necessary to resolve symlinked packages.
- Patch ports: any `patch-package` patch that relied on hoisted layout
  must be re-validated against the isolated layout. Coordinate with
  MT-6 (which owns the `patch-package` → `pnpm.patchedDependencies`
  migration).

### Out of Scope

- Remote-cache or Turbo wiring (separate plan).
- Yarn artifact removal and the pnpm version bump — both completed in #2069
  (no yarn artifacts remain; `packageManager` is already on the current pin).
- `mobile-sdk-alpha`, `webview-app`, `webview-bridge` source changes —
  only their build/resolution configs are in scope.

### Dependencies

- MT-6 must land first (it owns the patch migration). Patches handled by
  `pnpm.patchedDependencies` apply cleanly under both linkers;
  `patch-package` postinstall does not.
- MT-9 (`blockExoticSubdeps` + `strictPeerDependencies: true`) should land
  first if possible — it surfaces peer breakage that the isolated linker
  would otherwise mask as runtime errors.

### Per-gate Acceptance

Each gate below is a checkpoint. The PR cannot merge until every gate
passes on a clean checkout (no preserved `node_modules`).

**Gate 1 — pnpm install + JS test suites**

- `pnpm install --frozen-lockfile` succeeds from a clean checkout.
- `pnpm --filter @selfxyz/mobile-sdk-alpha test` passes.
- `pnpm --filter @selfxyz/webview-bridge test` passes.
- `pnpm --filter @selfxyz/webview-app build` succeeds.
- No package imports a dep it does not declare in its own
  `package.json` (`pnpm why` spot-check on at least: `react`,
  `react-native`, `@selfxyz/euclid`, `expo`).

**Gate 2 — Metro + Watchman**

- Metro must resolve symlinked packages. Verify `metro.config.js` in
  `app/` (and `mobile-sdk-demo`) declares `resolver.unstable_enableSymlinks: true`
  and that `watchFolders` includes the workspace root so Metro can
  traverse symlink targets.
- Watchman crawl completes without errors against the new symlinked
  layout. Capture `watchman watch-list` output and confirm no warnings
  about unreadable paths inside the pnpm store.
- `pnpm --filter @selfxyz/mobile-app start --reset-cache` boots Metro
  and serves `index.bundle` for both `platform=ios` and `platform=android`.

**Gate 3 — iOS / CocoaPods / Hermes / codegen**

- `pnpm --filter @selfxyz/mobile-app pod-install` (or the repo
  equivalent) succeeds. Pods that resolve native modules via
  `node_modules/<pkg>/<podspec>` paths must follow symlinks.
- Hermes + RN codegen run cleanly. Codegen scripts that walk
  parent directories looking for `node_modules` must terminate at the
  workspace root, not at a transient symlinked parent.
- `xcodebuild` release-mode build of the wallet app succeeds and
  produces a runnable `.app`.

**Gate 4 — Android / Gradle autolinking**

- Gradle autolinking discovers every native module. Inspect
  `android/app/build/generated/autolinking/autolinking.json` and
  confirm the module list matches the pre-change baseline.
- Release-mode `./gradlew :app:assembleRelease` succeeds for the
  wallet app and for `mobile-sdk-demo`.
- Hermes bytecode is generated and bundled.

**Gate 5 — End-to-end smoke**

- Manual cold-start of the wallet app on a real iOS device and a real
  Android device. Walk through: launch → verification entry → camera
  permission → NFC scan → biometric → result screen.
- `pnpm dedupe --check` exits clean.
- `find node_modules -mindepth 2 -name node_modules -type d` shows no
  unexpected nested duplicates.

### Rollback Criteria

Revert the linker switch (single-file change to `pnpm-workspace.yaml`)
and re-open MT-12 if any of the following hold at merge time:

- Any Gate 1–4 command fails on `main` post-merge.
- iOS or Android release build wall-clock time on CI increases by more
  than 25% relative to the pre-merge baseline.
- Metro cold-start time on a developer machine increases by more than
  50% relative to the pre-merge baseline.

### Files Modified

| File                                           | Change                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`                          | Remove `nodeLinker: hoisted`                                                                    |
| `.npmrc`                                       | Remove duplicate `node-linker=hoisted`; add isolated-linker-compatible flags with justification |
| `app/metro.config.js`                          | Enable symlink resolution; widen `watchFolders` if needed                                       |
| `packages/mobile-sdk-demo/metro.config.js`     | Same as above                                                                                   |
| `app/ios/Podfile` (if needed)                  | Adjust `pod` paths that bake in hoisted-layout assumptions                                      |
| `app/android/settings.gradle` (if needed)      | Adjust autolinking paths that bake in hoisted-layout                                            |
| Any `patches/*.patch` revalidated against pnpm | Re-base patches that referenced hoisted paths (coord. MT-6)                                     |

### Files NOT Modified

- TypeScript source in any workspace (this is a tooling-only change).
- `turbo.json` (MT-3 owns Turbo config).
- CI workflow files (MT-5 owns CI wiring; this plan ships under existing
  `pnpm -r` invocations or, if MT-3/4/5 landed first, under `turbo run`).

### Estimated PR Size

Configuration churn only — likely 100–300 LOC across `.npmrc`,
`pnpm-workspace.yaml`, Metro configs, and patch rebases. The risk is
not size; it is the surface area of build systems touched.

### Status Log

- 2026-05-13: Plan created.
