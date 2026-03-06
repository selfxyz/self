# CI Coverage Gaps — Packages

> Last updated: 2026-03-06
> Owner: SDK/infra maintainers
> Status: Archived

## North Star

- Every package under `packages/` has CI that catches compilation, type, and test failures before merge
- No silent regressions on either platform (Android + iOS) for KMP packages
- New packages get CI as part of their creation — this spec closes the existing debt

## Status Checklist

- [x] Chunk 1: webview-bridge CI
- [x] Chunk 2: webview-app CI
- [x] Chunk 3: KMP SDK — Android assemble + iOS framework link
- [x] Chunk 4: KMP test app — Android assemble + iOS build
- [x] Chunk 5: KMP minipay sample — Android assemble + iOS build
- [x] Chunk 6: RN SDK test app — iOS build
- [x] Chunk 7: self-sdk-swift — Swift build gate

## Current Coverage Audit

| Package              | Dedicated CI           | Tests         | Types | Build | Android       | iOS              |
| -------------------- | ---------------------- | ------------- | ----- | ----- | ------------- | ---------------- |
| `kmp-sdk`            | kmp-ci.yml             | jvmTest, iOS  | —     | —     | assembleDebug | framework, test  |
| `kmp-test-app`       | kmp-ci.yml             | debugUnitTest | —     | —     | assembleDebug | xcodebuild       |
| `kmp-minipay-sample` | kmp-ci.yml             | —             | —     | —     | assembleDebug | xcodebuild       |
| `mobile-sdk-alpha`   | mobile-sdk-ci.yml      | yes           | yes   | yes   | —             | —                |
| `mobile-sdk-demo`    | mobile-sdk-demo-ci.yml | yes           | —     | yes   | —             | —                |
| `rn-sdk`             | rn-sdk-test-app-ci.yml | yes           | yes   | tsup  | —             | —                |
| `rn-sdk-test-app`    | rn-sdk-test-app-ci.yml | —             | yes   | —     | assembleDebug | xcodebuild       |
| `self-sdk-swift`     | swift-sdk-ci.yml       | —             | —     | yes   | n/a           | xcodebuild (sim) |
| `webview-app`        | webview-app-ci.yml     | —             | yes   | yes   | n/a           | n/a              |
| `webview-bridge`     | webview-bridge-ci.yml  | yes           | yes   | yes   | n/a           | n/a              |

Legend: "—" = missing, "n/a" = not applicable (JS-only package).

## Runner Reference

- Ubuntu: `ubuntu-latest`
- macOS (Apple Silicon): `namespace-profile-apple-silicon-6cpu`

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
   - `cd packages/kmp-sdk-test-app/iosApp && pod install`
   - `xcodebuild -workspace iosApp.xcworkspace -scheme iosApp -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16' build`

**Trigger paths update:** Add `packages/kmp-sdk-test-app/**` (already present) and `packages/kmp-sdk/**` (already present).

**Files modified:**

- `.github/workflows/kmp-ci.yml`

**Files NOT modified:**

- `packages/kmp-sdk-test-app/` (no source changes)

**Validation:**

```bash
cd packages/kmp-sdk-test-app && ./gradlew :composeApp:assembleDebug
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
