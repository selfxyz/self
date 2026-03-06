# RN Test App MRZ Logic Consolidation — Follow-Up Spec

> Last updated: 2026-03-05
> Owner: Person 5 (RN SDK)
> Parent: [SDK Overview](../../OVERVIEW.md)
> Status: Active (Android consolidation landed; composite-build infra and iOS still pending)

## Execution Status (2026-03-05)

### PR 1 — Infra-B + Android Consolidation (merged)

- Completed: `MRZ-Infra-B` publication fix in `packages/kmp-sdk/shared/build.gradle.kts` by enabling Android MPP publication (`publishLibraryVariants("release")`) and removing broken `components["release"]` publishing wiring.
- Validated: `./gradlew :shared:publishToMavenLocal` now produces `~/.m2/repository/xyz/self/sdk/shared-android/0.1.0/shared-android-0.1.0.aar`.
- Completed (Android wiring): RN test app resolves `implementation("xyz.self.sdk:shared:0.1.0")` through `shared-android` with `mavenLocal()` enabled.
- Completed (Android scanner rewrite): `SelfMrzScannerActivity` now delegates scan/progress to `CameraMrzBridgeHandler.scanMrzWithPreview(...)`; local `SelfMrzParser.kt` removed.
- Completed (Android dependency cleanup): direct CameraX/ML Kit dependencies removed from RN test app; `camera-view` kept as `compileOnly` for `PreviewView` compile access while runtime deps come from SDK artifact.
- Completed (error-code contract): `SelfMrzScannerActivity` propagates `EXTRA_ERROR_CODE` on all failure paths (`MRZ_SCAN_FAILED`, `MRZ_SCAN_INVALID_RESULT`, `CAMERA_PERMISSION_DENIED`) so `SelfMRZScannerModule` can forward specific error codes to JS.

### Pending

- `MRZ-Infra-A` composite-build gate (`includeBuild("../../kmp-sdk")`) — blocked on AGP + Kotlin version alignment.
- iOS local SPM integration and scanner rewrite.

### Known limitation

Android SDK dependency uses `mavenLocal()` instead of composite build. Developers and CI must run `./gradlew :shared:publishToMavenLocal` in `packages/kmp-sdk` before building the RN test app. This will be resolved when Infra-A lands.

## North Star

- **Goal:** Reuse KMP/Swift MRZ camera logic in the RN test app and remove duplicate native parsing/scanning logic.
- **Success metric:** RN test app `camera.scanMRZ` behavior matches KMP helper behavior on Android and iOS while preserving existing RN bridge semantics.
- **Success metric:** RN test app scanner UX matches KMP test app UX for viewfinder layout, detection-state transitions, instructional copy, and cancellation flow.
- **Constraint:** Native code stays thin wrappers; parsing/detection logic is not duplicated across shells.

## Overview

You are consolidating MRZ camera logic in `packages/rn-sdk-test-app/` to use existing SDK-native implementations (`CameraMrzBridgeHandler` on Android and `MrzCameraHelper` from `self-sdk-swift` on iOS). This matters because the current test app duplicates scanner/parser logic in four files and will drift from the KMP/Swift reference over time.

## Prerequisites

- Familiarity with RN Android Gradle setup (`settings.gradle`, `app/build.gradle`) and local composite builds.
- Familiarity with iOS local SPM linking in `project.pbxproj`.
- Read [RN SDK Spec](./SPEC.md) and [Native Shells Spec](../native-shells/SPEC.md) for handler contracts.
- Kotlin version mismatch: RN test app uses Kotlin 2.0.0 (required by RN 0.76.9), KMP SDK uses 2.1.0. Bumping the test app to 2.1.0 fails with `Found interface KotlinTopLevelExtension, but class was expected` — KGP 2.1.0 has a binary-incompatible API change that breaks the React Native Gradle plugin. This is an infra blocker alongside AGP for composite builds.

## The Problem

| File                                                                                               | Issue                                                                                                             | Status |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| `packages/rn-sdk-test-app/android/app/src/main/java/com/selfxyz/demoapp/SelfMrzParser.kt`          | Duplicates MRZ extraction, parsing, and detection-state logic already available in SDK-side implementation.       | Removed (PR 1) |
| `packages/rn-sdk-test-app/android/app/src/main/java/com/selfxyz/demoapp/SelfMrzScannerActivity.kt` | Duplicates CameraX + ML Kit scan pipeline; should delegate to SDK handler logic while keeping local overlay UX.   | Rewritten (PR 1) |
| `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.swift`                            | Contains local parser + detection enum that duplicate Swift SDK helper behavior.                                  | Pending |
| `packages/rn-sdk-test-app/android/app/build.gradle`                                                | Declares CameraX/ML Kit deps locally despite these being available from SDK `shared` module once wiring is fixed. | Cleaned up (PR 1) |
| `packages/rn-sdk-test-app/android/settings.gradle`                                                 | Missing `includeBuild("../../kmp-sdk")` wiring for local dependency substitution.                                 | Pending (Infra-A) |
| `packages/rn-sdk-test-app/ios/SelfRNTestApp.xcodeproj/project.pbxproj`                             | Missing local SPM dependency for `../../self-sdk-swift`.                                                          | Pending |

## Design Principles

1. **Keep RN bridge contract stable.** `SelfMRZScannerModule` cancellation and success payloads remain unchanged (`MRZ_SCAN_CANCELLED`, `documentNumber`, `dateOfBirth`, `dateOfExpiry`).
2. **Reuse SDK-native logic, mimic KMP test app UX.** Keep RN scanner UI behavior aligned with KMP test app (frame geometry, color-state mapping, instruction copy, pulse behavior, cancel affordance), while delegating camera/OCR/parsing/detection internals to SDK helper classes.
3. **No scope creep into production SDK packages.** This follow-up is test-app integration cleanup, not a bridge protocol or `@selfxyz/rn-sdk` API change.

## Scope of Work

### Chunk MRZ-Infra-A: Composite Build Compatibility Gate (follow-up PR, blocked)

**Goal:** Replace `mavenLocal()` workaround with `includeBuild("../../kmp-sdk")` for zero-setup local dev.

**Blocked on two issues:**

1. **AGP mismatch:** RN test app uses AGP 8.11.2, KMP SDK uses 8.7.3. Gradle forbids mixed AGP in composite builds.
2. **Kotlin mismatch:** RN 0.76.9 locks Kotlin to 2.0.0. KMP SDK uses 2.1.0. Bumping the test app to 2.1.0 causes a binary incompatibility (`KotlinTopLevelExtension` class-to-interface change).

**Resolution paths (pick one):**

- Align AGP versions across both projects + downgrade KMP SDK to Kotlin 2.0.0
- Upgrade RN to 0.78+ (which supports KGP 2.1.x) and align AGP

**Likely touchpoints:**

- `packages/rn-sdk-test-app/android/build.gradle` — AGP version
- `packages/kmp-sdk/gradle/libs.versions.toml` — AGP version, Kotlin version
- `packages/kmp-sdk/shared/build.gradle.kts` — verify no breaking changes with AGP bump
- Validate all other KMP SDK consumers still build after alignment

**Definition of done:**

- `packages/rn-sdk-test-app/android/settings.gradle` can include `../../kmp-sdk` without AGP compatibility failure.
- `./gradlew :app:assembleDebug` succeeds in `packages/rn-sdk-test-app/android` with composite build enabled.
- `mavenLocal()` can be removed from test app `build.gradle` repositories.

### Chunk MRZ-Infra-B: Android Variant Publication Gate (done, PR 1)

**Status: Merged.**

Fixed by adding `publishLibraryVariants("release")` to the KMP `androidTarget` block and removing the broken `afterEvaluate` publishing block that referenced a null `components["release"]`.

### Chunk MRZ-Consolidation-Android: Android Scanner Consolidation (done, PR 1)

**Status: Merged.**

- `SelfMrzScannerActivity` rewritten to delegate to `CameraMrzBridgeHandler.scanMrzWithPreview(...)`.
- `SelfMrzParser.kt` deleted.
- Direct CameraX/ML Kit dependencies removed; `camera-view` kept as `compileOnly`.
- Error-code contract preserved: all failure paths propagate `EXTRA_ERROR_CODE`.
- SDK resolved via `mavenLocal()` as workaround for blocked Infra-A.

### Chunk MRZ-Consolidation-iOS: iOS Scanner Consolidation (follow-up PR)

**Depends on:** Local SPM wiring for `self-sdk-swift`.

**Goal:** Remove duplicate MRZ parsing/scanning logic from iOS side by delegating to `MrzCameraHelper`.

**Steps:**

1. iOS wiring:
   - Add local SPM package `../../self-sdk-swift` in `packages/rn-sdk-test-app/ios/SelfRNTestApp.xcodeproj/project.pbxproj`.
   - **Risk:** `self-sdk-swift` depends on `NFCPassportReader` via git SSH (`git@github.com:selfxyz/NFCPassportReader.git`). CI must have SSH key access to resolve this.
   - **Risk:** CocoaPods (`Podfile`) and SPM can coexist in one Xcode workspace, but `pod install` / workspace regeneration can silently drop SPM-linked targets. Verify after every `pod install`.
   - Minimum iOS target: Swift SDK requires iOS 15, RN test app targets iOS 15.1. Compatible.
2. iOS scanner rewrite:
   - Rewrite `SelfMRZScannerModule.swift` to use `MrzCameraHelper` from `SelfSdkSwift`.
   - API mapping for `MrzCameraHelper`:
     - `createCameraPreviewView(frame:)` — returns `UIView` with camera preview
     - `startCamera()` / `stopCamera()` — session lifecycle
     - `scanMrzWithCallbacks(progress:completion:)` — progress callback receives `MrzDetectionStateIndex` (Int 0-3 mapping to NO_TEXT/TEXT_DETECTED/ONE_MRZ_LINE/TWO_MRZ_LINES), completion receives `(Bool, String)` where the string is JSON on success or error message on failure
   - Map `MrzCameraHelper` completion to RN promise: success -> `resolve(parsed JSON dict)`, failure -> `reject("MRZ_SCAN_FAILED", ...)`, cancel -> `reject("MRZ_SCAN_CANCELLED", ...)`.
   - Remove local `SelfMrzSwiftParser`, `SelfMrzSwiftResult`, and `MrzDetectionState` enum.
   - Preserve existing module exports and cancellation semantics in `SelfMRZScannerModule.m` and Swift bridge code.
   - Align scanner UX behavior to KMP test app for state copy/colors/pulse and cancellation affordance.

**You will NOT:**

- Modify `packages/rn-sdk/src/handlers/CameraHandler.ts` contract.
- Modify `packages/webview-app/` camera flow semantics.
- Introduce new native modules or third-party camera libs in RN test app.

## Input / Output — Chunk Validation

**Android (validated in PR 1):**

```bash
cd packages/rn-sdk-test-app/android
./gradlew :app:assembleDebug
./gradlew :app:dependencies --configuration debugRuntimeClasspath
```

**iOS (pending):**

```bash
cd packages/rn-sdk-test-app/ios
xcodebuild -workspace SelfRNTestApp.xcworkspace -scheme SelfRNTestApp -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16'
```

**JS/bridge regression:**

```bash
cd /Volumes/files/Projects/selfxyz/selfapp
yarn workspace @selfxyz/rn-sdk test
```

**Manual verification:**

1. Launch RN test app camera flow and cancel scan on Android and iOS.
2. Confirm app receives `MRZ_SCAN_CANCELLED` and exits camera screen cleanly.
3. Scan a valid passport MRZ on Android and iOS.
4. Confirm result payload fields: `documentNumber`, `dateOfBirth`, `dateOfExpiry`.
5. Compare RN test app scanner screens against KMP test app and confirm parity for:
   - Viewfinder geometry and corner treatment.
   - Detection-state color transitions.
   - Instructional copy per state.
   - Pulse animation behavior in final detection state.
   - Cancel button placement and behavior.

## Tests

| Test                                    | Type   | What it validates                                                                                                                                                | Status  |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `rn-test-app.android-assemble`          | Build  | Android app builds with SDK dependency wiring.                                                                                                                   | Pass    |
| `rn-test-app.android-runtime-classpath` | Build  | SDK artifact/variant resolution includes expected camera stack.                                                                                                  | Pass    |
| `rn-test-app.ios-build`                 | Build  | Local `self-sdk-swift` SPM package is linked and compiles.                                                                                                       | Pending |
| `camera.cancelled.android`              | Manual | Cancellation still maps to `MRZ_SCAN_CANCELLED`.                                                                                                                 | Pass    |
| `camera.cancelled.ios`                  | Manual | Cancellation still maps to `MRZ_SCAN_CANCELLED`.                                                                                                                 | Pending |
| `camera.success.android`                | Manual | Returns required MRZ fields with delegated handler logic.                                                                                                        | Pass    |
| `camera.success.ios`                    | Manual | Returns required MRZ fields with delegated helper logic.                                                                                                         | Pending |
| `camera.error-codes.contract`           | Unit   | Native modules produce exact same error codes before/after rewrite (`MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `MRZ_SCAN_INVALID_RESULT`). | Pass (Android) |

## PR Strategy (revised)

1. **PR 1 (this PR, merged):** Infra-B (publication fix) + Android MRZ consolidation via `mavenLocal()`.
2. **PR 2 (follow-up):** iOS MRZ consolidation (SPM wiring + scanner rewrite).
3. **PR 3 (follow-up, blocked):** Infra-A — composite build (`includeBuild`) to replace `mavenLocal()`. Unblocked by AGP/Kotlin version alignment or RN 0.78+ upgrade.

Infra-A was originally planned as PR 1 but is blocked by AGP 8.7.3 vs 8.11.2 mismatch and Kotlin 2.0.0 vs 2.1.0 incompatibility. Infra-B was solvable independently, so it shipped first alongside the Android consolidation that depends on it. The `mavenLocal()` workaround bridges the gap until composite build is feasible.

## Explored Paths (validated and blocked)

These approaches were tested on 2026-03-05 and failed. Do not re-attempt without resolving the underlying issue.

| Approach                                             | Result                                                                          | Root cause                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeBuild("../../kmp-sdk")` in `settings.gradle` | BUILD FAILED                                                                    | AGP 8.7.3 vs 8.11.2 — Gradle forbids mixed AGP in composite builds                                                                                          |
| `publishToMavenLocal` + `mavenLocal()` repo          | Resolves metadata module only, no Android AAR                                   | KMP SDK `afterEvaluate` publishing block references `components["release"]` which is null; KMP Android target doesn't register as standard Gradle component |
| `publishReleasePublicationToMavenLocal` explicitly   | Produces empty POM, no AAR                                                      | Same root cause — no Android component registered                                                                                                           |
| Bump RN test app Kotlin to 2.1.0                     | BUILD FAILED: `Found interface KotlinTopLevelExtension, but class was expected` | KGP 2.1.0 has binary-incompatible API change vs RN 0.76.9 Gradle plugin                                                                                     |

## Definition of Done

- [x] Duplicate MRZ parser logic removed from RN test app Android (`SelfMrzParser.kt`).
- [x] Android scanner module is a thin wrapper around `CameraMrzBridgeHandler`.
- [x] Error-code contract preserved on all Android failure paths.
- [x] Android build passes with `mavenLocal()` SDK dependency.
- [ ] Duplicate MRZ parser logic removed from RN test app iOS (Swift parser/state types).
- [ ] iOS scanner module is a thin wrapper around `MrzCameraHelper`.
- [ ] iOS build passes with local SPM package linked.
- [ ] `mavenLocal()` replaced with composite build (Infra-A).
