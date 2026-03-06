# RN Test App MRZ Logic Consolidation — Follow-Up Spec

> Last updated: 2026-03-05
> Owner: Person 5 (RN SDK)
> Parent: [SDK Overview](../../OVERVIEW.md)
> Status: Active (Blocked on infra prerequisites)

## North Star

- **Goal:** Reuse KMP/Swift MRZ camera logic in the RN test app and remove duplicate native parsing/scanning logic.
- **Success metric:** RN test app `camera.scanMRZ` behavior matches KMP helper behavior on Android and iOS while preserving existing RN bridge semantics.
- **Success metric:** RN test app scanner UX matches KMP test app UX for viewfinder layout, detection-state transitions, instructional copy, and cancellation flow.
- **Constraint:** Native code stays thin wrappers; parsing/detection logic is not duplicated across shells.

## Overview

You are consolidating MRZ camera logic in `packages/rn-sdk-test-app/` to use existing SDK-native implementations (`CameraMrzBridgeHandler` on Android and `MrzCameraHelper` from `self-sdk-swift` on iOS). This matters because the current test app duplicates scanner/parser logic in four files and will drift from the KMP/Swift reference over time. You must land this as a follow-up PR only after two infrastructure blockers are resolved.

## Prerequisites

- Familiarity with RN Android Gradle setup (`settings.gradle`, `app/build.gradle`) and local composite builds.
- Familiarity with iOS local SPM linking in `project.pbxproj`.
- Read [RN SDK Spec](./SPEC.md) and [Native Shells Spec](../native-shells/SPEC.md) for handler contracts.
- Infra prerequisites must be merged first:
  - AGP compatibility fix for composite build (`includeBuild`) between test app and `packages/kmp-sdk`.
  - Android variant publication fix for `kmp-sdk/shared` Maven publication.
- Kotlin version mismatch: RN test app uses Kotlin 2.0.0 (required by RN 0.76.9), KMP SDK uses 2.1.0. Bumping the test app to 2.1.0 fails with `Found interface KotlinTopLevelExtension, but class was expected` — KGP 2.1.0 has a binary-incompatible API change that breaks the React Native Gradle plugin. This is a third infra blocker alongside AGP and Maven publication.

## The Problem

| File                                                                                               | Issue                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/rn-sdk-test-app/android/app/src/main/java/com/selfxyz/demoapp/SelfMrzParser.kt`          | Duplicates MRZ extraction, parsing, and detection-state logic already available in SDK-side implementation.       |
| `packages/rn-sdk-test-app/android/app/src/main/java/com/selfxyz/demoapp/SelfMrzScannerActivity.kt` | Duplicates CameraX + ML Kit scan pipeline; should delegate to SDK handler logic while keeping local overlay UX.   |
| `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.swift`                            | Contains local parser + detection enum that duplicate Swift SDK helper behavior.                                  |
| `packages/rn-sdk-test-app/android/app/build.gradle`                                                | Declares CameraX/ML Kit deps locally despite these being available from SDK `shared` module once wiring is fixed. |
| `packages/rn-sdk-test-app/android/settings.gradle`                                                 | Missing `includeBuild("../../kmp-sdk")` wiring for local dependency substitution.                                 |
| `packages/rn-sdk-test-app/ios/SelfRNTestApp.xcodeproj/project.pbxproj`                             | Missing local SPM dependency for `../../self-sdk-swift`.                                                          |

## Design Principles

1. **Keep RN bridge contract stable.** `SelfMRZScannerModule` cancellation and success payloads remain unchanged (`MRZ_SCAN_CANCELLED`, `documentNumber`, `dateOfBirth`, `dateOfExpiry`).
2. **Reuse SDK-native logic, mimic KMP test app UX.** Keep RN scanner UI behavior aligned with KMP test app (frame geometry, color-state mapping, instruction copy, pulse behavior, cancel affordance), while delegating camera/OCR/parsing/detection internals to SDK helper classes.
3. **Gate on infra, then refactor.** Do not start rewrite until composite build and publication prerequisites are passing.
4. **No scope creep into production SDK packages.** This follow-up is test-app integration cleanup, not a bridge protocol or `@selfxyz/rn-sdk` API change.

## Scope of Work

### Chunk MRZ-Infra-A: Composite Build Compatibility Gate (separate infra PR)

**Goal:** Make `includeBuild("../../kmp-sdk")` feasible for RN test app Android build.

**Known blocker (validated 2026-03-05):** `includeBuild("../../kmp-sdk")` in `settings.gradle` fails with:

```
Could not determine whether value 8.7.3 is compatible with value 8.11.2
using AgpVersionCompatibilityRule.
Using multiple versions of the Android Gradle plugin(8.7.3, 8.11.2)
in the same build is not allowed.
```

RN test app uses AGP 8.11.2 (via `com.android.tools.build:gradle:8.11.2` in `build.gradle`). KMP SDK uses AGP 8.7.3 (via `agp = "8.7.3"` in `gradle/libs.versions.toml`). Gradle forbids mixed AGP in composite builds.

**Also validated:** Kotlin version mismatch — RN test app is locked to Kotlin 2.0.0 by RN 0.76.9's Gradle plugin. KMP SDK uses 2.1.0. Bumping the test app to 2.1.0 causes a binary incompatibility (`KotlinTopLevelExtension` class→interface change). Resolution requires either downgrading KMP SDK to Kotlin 2.0.0 or upgrading RN to 0.78+ (which supports KGP 2.1.x).

**Likely touchpoints:**

- `packages/rn-sdk-test-app/android/build.gradle` — AGP version
- `packages/kmp-sdk/gradle/libs.versions.toml` — AGP version
- `packages/kmp-sdk/shared/build.gradle.kts` — verify no breaking changes with AGP bump
- Validate all other KMP SDK consumers still build after AGP alignment

**Definition of done:**

- `packages/rn-sdk-test-app/android/settings.gradle` can include `../../kmp-sdk` without AGP compatibility failure.
- `./gradlew :app:assembleDebug` succeeds in `packages/rn-sdk-test-app/android` with composite build enabled.

**You will NOT:**

- Rewrite MRZ scanner modules in this chunk.
- Change JS bridge payloads.

### Chunk MRZ-Infra-B: Android Variant Publication Gate (separate infra PR)

**Goal:** Publish/resolve the Android variant of `kmp-sdk/shared` with attributes usable by RN test app.

**Known blocker (validated 2026-03-05):** `publishToMavenLocal` publishes KMP metadata, JVM, and iOS variants but **not** the Android AAR. The `afterEvaluate` block in `shared/build.gradle.kts` references `components["release"]` which is null — the KMP Android target does not register as a standard Gradle component.

The published module metadata at `~/.m2/repository/xyz/self/sdk/shared/0.1.0/shared-0.1.0.module` contains variants for `iosArm64`, `iosSimulatorArm64`, `jvm`, and `metadata` — no Android variant.

**Likely touchpoints:**

- `packages/kmp-sdk/shared/build.gradle.kts` — fix Android variant publication (replace `components["release"]` with proper KMP Android publication wiring)
- `packages/kmp-sdk/build.gradle.kts` — if root-level publish config needed

**Definition of done:**

- `./gradlew :shared:publishToMavenLocal` produces an Android AAR or equivalent artifact under `~/.m2/repository/xyz/self/sdk/`.
- RN test app can resolve `implementation("xyz.self.sdk:shared")` (or agreed final coordinate) without missing-variant errors.
- `./gradlew :app:dependencies --configuration debugRuntimeClasspath` in RN test app shows resolved SDK Android artifact.

**You will NOT:**

- Change iOS integration in this chunk.
- Modify RN scanner UI.

### Chunk MRZ-Consolidation: Native MRZ Consolidation in RN Test App (follow-up PR)

**Depends on:** Chunk `MRZ-Infra-A` + `MRZ-Infra-B`.

**Goal:** Remove duplicate MRZ parsing/scanning logic from RN test app by delegating to SDK-native implementations.

**Steps:**

1. Android wiring:
   - Add `includeBuild("../../kmp-sdk")` in `packages/rn-sdk-test-app/android/settings.gradle`.
   - Add SDK dependency in `packages/rn-sdk-test-app/android/app/build.gradle`.
   - Remove local CameraX/ML Kit dependencies from app module if provided transitively by SDK module.
2. Android scanner rewrite:
   - Rewrite `SelfMrzScannerActivity.kt` to delegate camera+OCR+parse+detection progress to `CameraMrzBridgeHandler` (preview variant).
   - Keep result intent contract and align overlay/instruction/cancel UX to match KMP test app behavior.
   - Delete `SelfMrzParser.kt`.
3. iOS wiring:
   - Add local SPM package `../../self-sdk-swift` in `packages/rn-sdk-test-app/ios/SelfRNTestApp.xcodeproj/project.pbxproj`.
   - **Risk:** `self-sdk-swift` depends on `NFCPassportReader` via git SSH (`git@github.com:selfxyz/NFCPassportReader.git`). CI must have SSH key access to resolve this.
   - **Risk:** CocoaPods (`Podfile`) and SPM can coexist in one Xcode workspace, but `pod install` / workspace regeneration can silently drop SPM-linked targets. Verify after every `pod install`.
   - Minimum iOS target: Swift SDK requires iOS 15, RN test app targets iOS 15.1. Compatible.
4. iOS scanner rewrite:
   - Rewrite `SelfMRZScannerModule.swift` to use `MrzCameraHelper` from `SelfSdkSwift`.
   - API mapping for `MrzCameraHelper`:
     - `createCameraPreviewView(frame:)` → returns `UIView` with camera preview
     - `startCamera()` / `stopCamera()` → session lifecycle
     - `scanMrzWithCallbacks(progress:completion:)` → progress callback receives `MrzDetectionStateIndex` (Int 0-3 mapping to NO_TEXT/TEXT_DETECTED/ONE_MRZ_LINE/TWO_MRZ_LINES), completion receives `(Bool, String)` where the string is JSON on success or error message on failure
   - Map `MrzCameraHelper` completion to RN promise: success → `resolve(parsed JSON dict)`, failure → `reject("MRZ_SCAN_FAILED", ...)`, cancel → `reject("MRZ_SCAN_CANCELLED", ...)`.
   - Remove local `SelfMrzSwiftParser`, `SelfMrzSwiftResult`, and `MrzDetectionState` enum.
   - Preserve existing module exports and cancellation semantics in `SelfMRZScannerModule.m` and Swift bridge code.
   - Align scanner UX behavior to KMP test app for state copy/colors/pulse and cancellation affordance.

**You will NOT:**

- Modify `packages/rn-sdk/src/handlers/CameraHandler.ts` contract.
- Modify `packages/webview-app/` camera flow semantics.
- Introduce new native modules or third-party camera libs in RN test app.

## Input / Output — Chunk Validation

**Input:**

```bash
# Android
cd packages/rn-sdk-test-app/android
./gradlew :app:assembleDebug
./gradlew :app:dependencies --configuration debugRuntimeClasspath

# iOS
cd packages/rn-sdk-test-app/ios
xcodebuild -workspace SelfRNTestApp.xcworkspace -scheme SelfRNTestApp -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16'

# JS/bridge regression
cd /Volumes/files/Projects/selfxyz/selfapp
yarn workspace @selfxyz/rn-sdk test
```

**Expected output:**

- Android debug build succeeds with SDK dependency resolution and no duplicate-class/dependency conflicts.
- iOS simulator build succeeds with local SPM package linked.
- `@selfxyz/rn-sdk` tests still pass (including cancellation behavior for camera handler).

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

| Test                                    | Type   | What it validates                                                                                                                                                |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rn-test-app.android-assemble`          | Build  | Android app builds with SDK dependency wiring.                                                                                                                   |
| `rn-test-app.android-runtime-classpath` | Build  | SDK artifact/variant resolution includes expected camera stack.                                                                                                  |
| `rn-test-app.ios-build`                 | Build  | Local `self-sdk-swift` SPM package is linked and compiles.                                                                                                       |
| `camera.cancelled.android`              | Manual | Cancellation still maps to `MRZ_SCAN_CANCELLED`.                                                                                                                 |
| `camera.cancelled.ios`                  | Manual | Cancellation still maps to `MRZ_SCAN_CANCELLED`.                                                                                                                 |
| `camera.success.android`                | Manual | Returns required MRZ fields with delegated handler logic.                                                                                                        |
| `camera.success.ios`                    | Manual | Returns required MRZ fields with delegated helper logic.                                                                                                         |
| `camera.error-codes.contract`           | Unit   | Native modules produce exact same error codes before/after rewrite (`MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `MRZ_SCAN_INVALID_RESULT`). |

## PR Strategy

1. **PR 1 (Infra):** Composite build AGP compatibility.
2. **PR 2 (Infra):** Android variant publication/resolution from `kmp-sdk/shared`.
3. **PR 3 (This spec):** MRZ logic consolidation in RN test app.

## Explored Paths (validated and blocked)

These approaches were tested on 2026-03-05 and failed. Do not re-attempt without resolving the underlying issue.

| Approach                                             | Result                                                                          | Root cause                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeBuild("../../kmp-sdk")` in `settings.gradle` | BUILD FAILED                                                                    | AGP 8.7.3 vs 8.11.2 — Gradle forbids mixed AGP in composite builds                                                                                          |
| `publishToMavenLocal` + `mavenLocal()` repo          | Resolves metadata module only, no Android AAR                                   | KMP SDK `afterEvaluate` publishing block references `components["release"]` which is null; KMP Android target doesn't register as standard Gradle component |
| `publishReleasePublicationToMavenLocal` explicitly   | Produces empty POM, no AAR                                                      | Same root cause — no Android component registered                                                                                                           |
| Bump RN test app Kotlin to 2.1.0                     | BUILD FAILED: `Found interface KotlinTopLevelExtension, but class was expected` | KGP 2.1.0 has binary-incompatible API change vs RN 0.76.9 Gradle plugin                                                                                     |

## Fallback Plan

If infra PRs (MRZ-Infra-A + MRZ-Infra-B) remain blocked for >2 weeks, consider:

1. **Extract lightweight shared module.** Copy `MrzParser.kt`, `MrzDetectionState.kt`, and `MrzCameraHelper.swift` into a standalone `packages/mrz-shared/` module with minimal dependencies (no WebView, no NFC, no full SDK). Publish as its own artifact. Both KMP test app and RN test app consume it.
2. **Accept duplication with lint guard.** Keep current duplicated files but add a CI check that diffs the RN test app parser against the SDK parser and fails if they diverge.

Option 1 is preferable but adds a new package. Option 2 is zero-cost but fragile.

## Definition of Done

- Duplicate MRZ parser logic is removed from RN test app (`SelfMrzParser.kt` + local Swift parser/state types).
- RN test app scanner modules are thin wrappers around SDK-native camera helpers.
- Existing RN bridge API and cancellation semantics are unchanged.
- Android/iOS builds pass with dependency wiring in place.
- Follow-up PR description documents that the change is DRY consolidation after infra unblock.
