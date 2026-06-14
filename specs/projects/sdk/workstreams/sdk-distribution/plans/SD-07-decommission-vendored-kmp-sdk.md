## Decommission Vendored KMP SDK (consume external `self-webview-sdk`)

> Last updated: 2026-06-14
> Status: **DRAFT — FOR REVIEW. Blocked on prerequisite + SD-06 reconciliation (see Open Decisions).**

- Workstream: sdk-distribution
- Backlog IDs: SD-07 (proposed — not yet added to `SPEC.md`)
- Owner: TBD
- Branch: `chore/deprecate-kmp-sdk` (currently 0 commits ahead of `main`)
- PR: TBD
- Linear: not yet created (do not create until Open Decisions are resolved)

### Why

The KMP SDK source has moved to a standalone repo, `selfxyz/self-webview-sdk`, intended to own publishing. The monorepo's vendored `packages/kmp-sdk` (+ `packages/kmp-sdk-test-app`) is a stale duplicate (last touched 2026-04-30). Goal: delete the vendored copy and make the one real in-monorepo consumer depend on the **externally published** artifact instead. This is a dependency/wiring change — no SDK behavior change.

### ⚠️ Open Decisions (block "Ready" — owner must resolve before execution)

These are not implementation choices; they are facts/decisions an agent cannot resolve alone.

1. **CANONICAL HOME is still undecided (WIA-17).** The split between this repo's `packages/kmp-sdk/` and `selfxyz/self-webview-sdk`'s `kmp-sdk/` has no written convergence plan. See [WIA-17 open questions](../webview-in-app/plans/SPIKE-rn-wraps-kmp.md): one live option is the **opposite** of this spec — keep kmp-sdk in *this* repo behind `self.sdk.optional.*` build flags and **retire `self-webview-sdk`** ([WIA-17-open-questions.js](../webview-in-app/plans/WIA-17-open-questions.js)). SD-07 is only valid if `self-webview-sdk` is confirmed canonical. **Resolve this first; it gates everything below.**

2. **PREREQUISITE — no external release exists yet.** As of 2026-06-14, `selfxyz/self-webview-sdk` is **private**, default branch `dev`, last push 2026-06-10, **zero releases, zero git tags**. Its `kmp-sdk/shared/build.gradle.kts` *does* configure publishing (`group = xyz.self.sdk`, `version = 0.1.0`, `publishLibraryVariants("release")`, repo `https://maven.pkg.github.com/selfxyz/self-webview-sdk`, **no artifactId override**), but its `kmp-sdk/Package.swift` still uses a **local binary path** (`./shared/build/xcframework/SelfSdk.xcframework`), so iOS SPM consumption is not release-ready. **This spec cannot execute until self-webview-sdk cuts a tagged Maven release AND a remote-URL+checksum SPM release.**

3. **Conflicts with SD-06 (SELF-2534).** [SD-06](./SD-06-kmp-remote-publishing.md) assumes the **monorepo's** `packages/kmp-sdk` is the publishing source-of-truth. SD-07's premise supersedes it. Already reflected in the parent [SPEC.md](../SPEC.md) (SD-06 set to Blocked, SD-06/SD-07 marked mutually exclusive). On confirming the canonical home: if external → move SD-06 to Cancelled and update [kmp-revival SPEC](../kmp-revival/SPEC.md); if this repo → cancel SD-07 instead.

4. **Coordinate matches today — no rename.** Because the external `build.gradle.kts` does **not** override artifactId, it will publish `xyz.self.sdk:shared` (KMP/JVM) and `xyz.self.sdk:shared-android` (Android), at `version = 0.1.0` — i.e. the **same coordinates the monorepo code already references** (`rn-sdk` → `shared-android:0.1.0`; `rn-sdk-test-app` → `shared:0.1.0`). The rewire is therefore *swap the resolution source* (mavenLocal / composite build → external GitHub Packages), **not** a coordinate change. Note this diverges from SD-06's planned `self-sdk-kmp` artifactId — confirm the external repo keeps the un-overridden name before pinning.

5. **`packages/self-sdk-swift` fate (iOS).** The monorepo's `packages/self-sdk-swift` is a local duplicate of the external repo's `self-sdk-swift` SPM package (the `SelfSdkSwift` product, which itself depends on `selfxyz/NFCPassportReader`). Decide: stays local, moves to external SPM consumption, or is deleted. This is independent of the KMP XCFramework (`SelfSdk`) decision — they are two separate Swift packages in the external repo.

### Corrections to the originating prompt

The prompt's audit assumptions are partly wrong; do not trust them verbatim:

- **The app does not consume kmp-sdk directly.** No `xyz.self.sdk` / `mavenLocal` references exist in `app/android/`. The prompt's "rewire the app" framing is incorrect.
- **The production Android consumer is `@selfxyz/rn-sdk` (`packages/rn-sdk`), which the prompt never names.** `packages/rn-sdk/android/build.gradle:60,75` adds `mavenLocal()` and declares `compileOnly "xyz.self.sdk:shared-android:0.1.0"`; `SelfBridgeModule.kt` imports `xyz.self.sdk.*`. The app depends on `@selfxyz/rn-sdk` (`workspace:^`, `app/package.json:108`). **This is the only consumer in the production app's build graph.**
- **`rn-sdk` has NO iOS `SelfSdkSwift` dependency.** Its podspec (`selfxyz-rn-sdk`) declares only `React-Core`; there is no `SelfSdkSwift` reference under `packages/rn-sdk/ios/`. The iOS `SelfSdkSwift` consumers are **`packages/rn-sdk-test-app`** (`ios/SelfRNTestApp/SelfMRZScannerModule.swift:8` + SPM product in the `.xcodeproj`) and the **KMP sample apps** (`kmp-sdk-test-app`, `kmp-minipay-sample`) — all test/sample scaffolds, not the production app.
- **The react-native-passport-reader analogy is false.** passport-reader is *also* vendored locally — `app/android/settings.gradle:22-23` does `include ':react-native-passport-reader'` + local `projectDir`, and `app/android/app/build.gradle:241` does `implementation(project(":react-native-passport-reader"))`. It is **not** an external Maven artifact. Mirror the external GitHub Packages Maven setup (`maven.pkg.github.com/selfxyz/self-webview-sdk`) instead.
- **Consumers/callers the prompt missed:** `packages/rn-sdk` (production Android consumer, above); `packages/rn-sdk-test-app` (Android `includeBuild('../../kmp-sdk')` + `dependencySubstitution` of `xyz.self.sdk:shared` and `implementation("xyz.self.sdk:shared:0.1.0")`; iOS `SelfSdkSwift`); `packages/kmp-minipay-sample` (`settings.gradle.kts:31` `includeBuild("../kmp-sdk")`, imports `SelfSdkSwift`); `packages/self-sdk-swift` (sync comment referencing `packages/kmp-sdk/...`); and a **third local-publish caller** `app/scripts/mobile-ci-build-android.sh:242` (runs `node scripts/publish-kmp-local.cjs`).

### Phase 1 — Audit (read-only; already partly done above)

Confirm the full reference inventory before changing anything. Known live references (verify each still present):

| Reference | Location | Disposition |
| --- | --- | --- |
| `@selfxyz/kmp-sdk` build filter; `kmp:*` scripts | `package.json:19,36-42` | Remove |
| Lockfile workspace entries | `pnpm-lock.yaml:1068,1070` | Auto-removed by `pnpm install` after dirs deleted (see note below) |
| Production Android consumer (`compileOnly`) | `packages/rn-sdk/android/build.gradle:60,75` | **Rewire to external Maven** |
| Local-publish script | `app/scripts/publish-kmp-local.cjs` | Remove with all 3 callers below |
| CI: publish-to-mavenLocal step | `.github/workflows/mobile-e2e.yml:357-359` | Remove step |
| CI: publish-to-mavenLocal step | `.github/workflows/mobile-deploy.yml:1116-1121` | Remove step |
| Script: local-publish caller | `app/scripts/mobile-ci-build-android.sh:240-247` | Remove step (3rd caller) |
| CI: dedicated KMP pipeline | `.github/workflows/kmp-ci.yml` (whole file) | Delete |
| CI: rn-sdk-test-app builds kmp-sdk | `.github/workflows/rn-sdk-test-app-ci.yml:12,22,83` | Remove kmp build/triggers |
| Scaffold: Android composite build | `packages/rn-sdk-test-app/android/settings.gradle:8`; `app/build.gradle:65` | See decision #4 (rewire if kept) |
| Scaffold: Android composite build | `packages/kmp-minipay-sample/settings.gradle.kts:31` | See decision #4 |
| Scaffold: iOS `SelfSdkSwift` | `packages/rn-sdk-test-app/ios/...`; `packages/kmp-minipay-sample/iosApp/...` | See decision #4 + #5 |
| iOS sync comment | `packages/self-sdk-swift/.../SdkConstants.swift:8` | Update/remove |
| Tech-debt baseline entries | `docs/maintenance/tech-debt-baseline.json:639-673` | Remove |

**Decision #4 (scope of deletion):** `packages/kmp-sdk-test-app`, `packages/kmp-minipay-sample`, and `packages/rn-sdk-test-app` are scaffolds that exercise the vendored kmp-sdk and also exist in the external repo. Confirm with owner whether they are deleted alongside `kmp-sdk` or retained/rewired. Default recommendation: **delete `kmp-sdk-test-app` and `kmp-minipay-sample`** (pure duplicates of external repo). If **`rn-sdk-test-app` is kept**, it must also be rewired: replace `settings.gradle:8` `includeBuild('../../kmp-sdk') { dependencySubstitution { substitute module('xyz.self.sdk:shared') ... } }` and `app/build.gradle:65` `implementation("xyz.self.sdk:shared:0.1.0")` with the external Maven repo, and repoint its iOS `SelfSdkSwift` SPM product. Note it pins `xyz.self.sdk:shared` (KMP variant) whereas `rn-sdk` uses `xyz.self.sdk:shared-android` (Android variant) — both resolve from the same external publication but are distinct coordinates.

> **Workspace globs:** there are **no KMP-specific workspace globs to remove.** `pnpm-workspace.yaml` uses a broad `packages/*` (plus `app`); root `package.json` does not enumerate KMP packages. Deleting the directories and running `pnpm install` drops the `pnpm-lock.yaml:1068,1070` importer entries automatically. The only package.json edits are the build filter + `kmp:*` scripts above.

### Phase 2 — Remove & Rewire (only after Open Decisions resolved)

1. **`packages/rn-sdk/android/build.gradle`** (the one production consumer) — replace `mavenLocal()` + `compileOnly "xyz.self.sdk:shared-android:0.1.0"` with the external GitHub Packages Maven repo (`https://maven.pkg.github.com/selfxyz/self-webview-sdk`) and the same coordinate at the released version (per decision #4, the coordinate is unchanged). Reuse the credential mechanism SD-06 documented (`gpr.user`/`gpr.token` or `GITHUB_ACTOR`/`GITHUB_TOKEN`). Keep `compileOnly` (the AAR stays a provided dependency).
2. **iOS** — there is nothing to rewire in `rn-sdk` (no `SelfSdkSwift` dependency). iOS rewiring applies only to the scaffolds retained under decision #4 (`rn-sdk-test-app`, sample apps): repoint their `SelfSdkSwift` SPM product from the local `packages/self-sdk-swift` to the external SPM package (git URL + pinned tag), per decision #5. If all iOS scaffolds are deleted, this step is a no-op.
3. **Delete** `packages/kmp-sdk/`, `packages/kmp-sdk-test-app/` (+ others per decision #4) and `app/scripts/publish-kmp-local.cjs`.
4. **Remove** the `kmp:*` root scripts + build-filter exclusion (`package.json:19,36-42`), the three local-publish callers (`mobile-e2e.yml`, `mobile-deploy.yml`, `mobile-ci-build-android.sh`), `kmp-ci.yml`, the kmp build/triggers in `rn-sdk-test-app-ci.yml`, the `self-sdk-swift` sync comment, and the tech-debt baseline entries listed in Phase 1. (No workspace-glob edits — see Phase 1 note.)
5. Re-run `pnpm install` so the deleted importers drop out of `pnpm-lock.yaml`.

### Validation

```bash
# No live references remain. Scope to live source/config; exclude build output,
# node_modules, the specs/docs that legitimately discuss this work, and archives.
rg -n "packages/kmp-sdk|@selfxyz/kmp-sdk|publish-kmp-local|xyz\.self\.sdk" \
  app packages .github \
  -g '!**/node_modules/**' -g '!**/build/**' -g '!**/.gradle/**' -g '!**/dist/**'
# Expected after the change: only live references inside RETAINED scaffolds (if any
# kept per decision #4), now pointing at the external Maven repo — no mavenLocal,
# no includeBuild('../kmp-sdk'), no publish-kmp-local.

# Workspace resolves cleanly (deleted importers drop from the lockfile)
pnpm install

# rn-sdk resolves xyz.self.sdk:shared-android from the EXTERNAL repo, not mavenLocal
cd packages/rn-sdk/android && ./gradlew dependencies --configuration debugCompileClasspath | grep -i self.sdk

# App Android build compiles rn-sdk against the external artifact (no publish-kmp-local step)
cd app/android && ./gradlew :app:assembleDebug

# iOS (only if SelfSdkSwift scaffolds were retained) resolves external SPM, no local path
# xcodebuild -workspace packages/rn-sdk-test-app/ios/*.xcworkspace -scheme ... build
```

- CI green with kmp-sdk jobs removed.
- PR explicitly states: which `self-webview-sdk` tag/version was pinned; the exact Maven coordinate(s) used; the SPM URL+tag+checksum (if iOS scaffolds retained); release-vs-debug XCFramework choice; the `read:packages` auth requirement for the (currently private) GitHub Packages repo; and that `rn-sdk` was the only production consumer.

### Out of Scope

- Any SDK behavior change. Wiring/dependency only.
- Changes to `app/` source (it consumes rn-sdk, not kmp-sdk).
- Publishing config inside `self-webview-sdk` (that repo owns it; it is the prerequisite, not this PR).

### Estimated PR Size

~200-400 LOC (mostly deletions). Within target.

### Status Log

- 2026-06-14: Draft created for review from external prompt. Flagged unmet prerequisite (no external release) and SD-06 conflict. Audit corrected: real consumer is `@selfxyz/rn-sdk`, not the app.
- 2026-06-14: Review pass. Wired SD-07 + SD-06 reconciliation into parent SPEC.md. Added WIA-17 canonical-home decision as the gating item. Fixed iOS scope (rn-sdk has no SelfSdkSwift dep; real iOS consumers are rn-sdk-test-app + sample apps), added rn-sdk-test-app Android composite-build rewiring, the third local-publish caller (`mobile-ci-build-android.sh`), corrected the workspace-glob claim, tightened the validation grep, and sharpened external-release acceptance criteria (coordinate unchanged, SPM not yet remote, private-repo auth).
