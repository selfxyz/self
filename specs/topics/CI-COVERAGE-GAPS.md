# CI Coverage Gaps — Packages

> Last updated: 2026-03-05
> Owner: SDK/infra maintainers
> Status: Active

## North Star

- Every package under `packages/` has CI that catches compilation, type, and test failures before merge
- No silent regressions on either platform (Android + iOS) for KMP packages
- New packages get CI as part of their creation — this spec closes the existing debt

## Status Checklist

- [ ] Chunk 1: webview-bridge CI
- [ ] Chunk 2: webview-app CI
- [ ] Chunk 3: KMP SDK — Android assemble + iOS framework link
- [ ] Chunk 4: KMP test app — Android assemble + iOS build
- [ ] Chunk 5: KMP minipay sample — Android assemble + iOS build
- [ ] Chunk 6: RN SDK test app — iOS build
- [ ] Chunk 7: self-sdk-swift — Swift build gate

## Current Coverage Audit

| Package              | Dedicated CI           | Tests         | Types | Build | Android       | iOS |
| -------------------- | ---------------------- | ------------- | ----- | ----- | ------------- | --- |
| `kmp-sdk`            | kmp-ci.yml             | jvmTest       | —     | —     | —             | —   |
| `kmp-test-app`       | kmp-ci.yml             | debugUnitTest | —     | —     | —             | —   |
| `kmp-minipay-sample` | —                      | —             | —     | —     | —             | —   |
| `mobile-sdk-alpha`   | mobile-sdk-ci.yml      | yes           | yes   | yes   | —             | —   |
| `mobile-sdk-demo`    | mobile-sdk-demo-ci.yml | yes           | —     | yes   | —             | —   |
| `rn-sdk`             | rn-sdk-test-app-ci.yml | yes           | yes   | tsup  | —             | —   |
| `rn-sdk-test-app`    | rn-sdk-test-app-ci.yml | —             | yes   | —     | assembleDebug | —   |
| `self-sdk-swift`     | —                      | —             | —     | —     | —             | —   |
| `webview-app`        | —                      | —             | —     | —     | n/a           | n/a |
| `webview-bridge`     | —                      | —             | —     | —     | n/a           | n/a |

Legend: "—" = missing, "n/a" = not applicable (JS-only package).

## Runner Reference

- Ubuntu: `ubuntu-latest`
- macOS (Apple Silicon): `namespace-profile-apple-silicon-6cpu`

## Overlap / Cleanup Opportunities

### 1. `mobile-ci.yml` build-ios and build-android are dead weight on PRs

Both jobs have `if: github.event_name == 'workflow_dispatch'` — they never run on PRs. The comments say "mostly covered in mobile-e2e.yml." But `mobile-e2e.yml` also only runs on `push` to protected branches + `workflow_dispatch` for the iOS job. Net result: **no iOS or Android build gate runs on PRs for `app/`** unless manually triggered. The `mobile-ci.yml` iOS/Android jobs should either be enabled on PRs or removed to reduce confusion.

**Recommendation:** Either remove the dead `build-ios`/`build-android` jobs from `mobile-ci.yml` (since `mobile-e2e.yml` covers them on push), or re-enable them on PRs if you want PR-level build gates. Don't keep both workflows with disabled jobs.

### 2. `mobile-sdk-demo-e2e.yml` Android E2E is build-only with all E2E steps `if: false`

Every Maestro/emulator step is guarded by `if: false`. It's a 170-line workflow that does `assembleDebug` + verify APK exists. The `mobile-sdk-demo-ci.yml` already does `test + build` for the demo app. The only unique value is the APK artifact verification — marginal.

**Recommendation:** Either re-enable the E2E tests or consolidate the Android build into `mobile-sdk-demo-ci.yml` and remove the dead workflow. The iOS E2E job in this workflow is actually live and useful — keep that.

### 3. `mobile-ci.yml` has debug logging that should be cleaned up

Steps like "Debug Cache Restoration", "Force Build Dependencies If Missing", and comments like "Temporarily always build to debug CI issues" suggest this workflow has accumulated debugging scaffolding that was never removed.

**Recommendation:** Clean up after the current caching issues are resolved. Not blocking but adds noise.

### 4. `mobile-sdk-ci.yml` duplicates build step across every job

Each of `lint`, `format`, `types`, `test` independently restores cache and falls back to a full rebuild. The `build` job saves the cache, but the restore is flaky enough that every job has a fallback build. This means `mobile-sdk-alpha` could be built up to 5 times in one CI run.

**Recommendation:** Low priority, but could use a shared artifact (upload/download) instead of cache if cache misses are frequent.

## Chunks

### Chunk 1: webview-bridge CI (S ~2k)

**Priority:** High — webview-bridge is a core dependency for rn-sdk and kmp-sdk.

**Create:** `.github/workflows/webview-bridge-ci.yml`

**Trigger paths:** `packages/webview-bridge/**`

**Jobs:**

- `build`: `yarn workspace @selfxyz/webview-bridge build`
- `types`: `yarn workspace @selfxyz/webview-bridge typecheck`
- `test`: `yarn workspace @selfxyz/webview-bridge test`

**Runner:** `ubuntu-latest`

**Files modified:**

- `.github/workflows/webview-bridge-ci.yml` (create)

**Files NOT modified:**

- `packages/webview-bridge/` (no source changes)

**Validation:**

```bash
# Trigger: open a PR that touches packages/webview-bridge
# Expect: workflow runs build, types, test jobs
gh workflow view webview-bridge-ci.yml
```

---

### Chunk 2: webview-app CI (S ~2k)

**Priority:** High — webview-app is the UI surface loaded by both KMP and RN SDKs. Zero CI today.

**Create:** `.github/workflows/webview-app-ci.yml`

**Trigger paths:** `packages/webview-app/**`, `packages/webview-bridge/**` (transitive dep)

**Jobs:**

- `build`: build webview-bridge first, then `yarn workspace @selfxyz/webview-app build`
- `types`: `yarn workspace @selfxyz/webview-app typecheck`

**Runner:** `ubuntu-latest`

**Files modified:**

- `.github/workflows/webview-app-ci.yml` (create)

**Files NOT modified:**

- `packages/webview-app/` (no source changes)

**Validation:**

```bash
gh workflow view webview-app-ci.yml
```

---

### Chunk 3: KMP SDK — Android assemble + iOS framework link (S ~2k)

**Priority:** High — iOS compilation is completely unchecked. Android compilation only happens transitively via jvmTest.

**Modify:** `.github/workflows/kmp-ci.yml`

**Add jobs:**

1. `android-build` (ubuntu-latest):
   - `./gradlew :shared:assembleDebug`

2. `ios-framework` (namespace-profile-apple-silicon-6cpu):
   - `./gradlew :shared:linkDebugFrameworkIosSimulatorArm64`
   - Validates Kotlin/Native iOS compilation

3. `ios-test` (namespace-profile-apple-silicon-6cpu):
   - `./gradlew :shared:iosSimulatorArm64Test`
   - Runs common tests on iOS target

**Files modified:**

- `.github/workflows/kmp-ci.yml`

**Files NOT modified:**

- `packages/kmp-sdk/` (no source changes)

**Validation:**

```bash
# Local verification before pushing:
cd packages/kmp-sdk && ./gradlew :shared:assembleDebug
cd packages/kmp-sdk && ./gradlew :shared:linkDebugFrameworkIosSimulatorArm64
```

---

### Chunk 4: KMP test app — Android assemble + iOS build (M ~4k)

**Priority:** Medium — catches manifest/resource issues and iOS project breakage.

**Modify:** `.github/workflows/kmp-ci.yml`

**Add jobs:**

1. `kmp-test-app-android-build` (ubuntu-latest):
   - `./gradlew :composeApp:assembleDebug`

2. `kmp-test-app-ios-build` (namespace-profile-apple-silicon-6cpu):
   - Build the KMP framework first: `cd ../kmp-sdk && ./gradlew :shared:linkDebugFrameworkIosSimulatorArm64`
   - `cd packages/kmp-test-app/iosApp && pod install`
   - `xcodebuild -workspace iosApp.xcworkspace -scheme iosApp -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build`

**Trigger paths update:** Add `packages/kmp-test-app/**` (already present) and `packages/kmp-sdk/**` (already present).

**Files modified:**

- `.github/workflows/kmp-ci.yml`

**Files NOT modified:**

- `packages/kmp-test-app/` (no source changes)

**Validation:**

```bash
cd packages/kmp-test-app && ./gradlew :composeApp:assembleDebug
```

---

### Chunk 5: KMP minipay sample — Android assemble + iOS build (S ~2k)

**Priority:** Low — sample app, but should still compile.

**Modify:** `.github/workflows/kmp-ci.yml`

**Trigger paths update:** Add `packages/kmp-minipay-sample/**`

**Add jobs:**

1. `kmp-minipay-android-build` (ubuntu-latest):
   - `cd packages/kmp-minipay-sample && ./gradlew :composeApp:assembleDebug`

2. `kmp-minipay-ios-build` (namespace-profile-apple-silicon-6cpu):
   - Build KMP framework, pod install, xcodebuild (same pattern as chunk 4)

**Files modified:**

- `.github/workflows/kmp-ci.yml`

**Files NOT modified:**

- `packages/kmp-minipay-sample/` (no source changes)

---

### Chunk 6: RN SDK test app — iOS build (S ~3k)

**Priority:** Medium — Android build exists, iOS build is missing.

**Modify:** `.github/workflows/rn-sdk-test-app-ci.yml`

**Add job:**

1. `ios-build` (namespace-profile-apple-silicon-6cpu):
   - `yarn install`
   - Build webview-bridge (transitive dep)
   - `cd packages/rn-sdk-test-app/ios && pod install`
   - `xcodebuild -workspace RnSdkTestApp.xcworkspace -scheme RnSdkTestApp -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build`

**Files modified:**

- `.github/workflows/rn-sdk-test-app-ci.yml`

**Files NOT modified:**

- `packages/rn-sdk-test-app/` (no source changes)

**Validation:**

```bash
cd packages/rn-sdk-test-app/ios && pod install && xcodebuild -workspace RnSdkTestApp.xcworkspace -scheme RnSdkTestApp -sdk iphonesimulator build
```

---

### Chunk 7: self-sdk-swift — Swift build gate (S ~2k)

**Priority:** Low — SPM package, should at least compile.

**Create:** `.github/workflows/swift-sdk-ci.yml`

**Trigger paths:** `packages/self-sdk-swift/**`

**Jobs:**

1. `build` (namespace-profile-apple-silicon-6cpu):
   - `cd packages/self-sdk-swift && swift build`

**Files modified:**

- `.github/workflows/swift-sdk-ci.yml` (create)

**Files NOT modified:**

- `packages/self-sdk-swift/` (no source changes)

---

## Dependency Graph

```
Chunk 1 (webview-bridge)  ──→  Chunk 2 (webview-app) depends on bridge CI existing
Chunk 3 (kmp-sdk)         ──→  Chunk 4 (kmp-test-app) depends on kmp-sdk iOS framework
                           ──→  Chunk 5 (kmp-minipay) same dependency
Chunk 6 (rn-sdk-test-app iOS) — independent
Chunk 7 (self-sdk-swift)       — independent
```

Parallel execution: Chunks 1, 3, 6, 7 can all start in parallel. Chunk 2 after 1. Chunks 4, 5 after 3.

## Files NOT Modified

- No source code in any package is changed
- No test files are changed
- Only `.github/workflows/*.yml` files are created or modified

## Definition of Done

Every package under `packages/` triggers at least one CI workflow on PR that validates compilation succeeds on all platforms the package targets. The coverage audit table above has no "—" entries for applicable cells.
