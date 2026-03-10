# RN Test App MRZ Logic Consolidation — Follow-Up Spec

> Last updated: 2026-03-06
> Owner: Person 5 (RN SDK)
> Parent: [SDK Overview](../../OVERVIEW.md)
> Status: Complete

## Execution Status (2026-03-06)

### PR 1 — Infra-B + Android Consolidation (merged)

- Completed: `MRZ-Infra-B` publication fix in `packages/kmp-sdk/shared/build.gradle.kts` by enabling Android MPP publication (`publishLibraryVariants("release")`) and removing broken `components["release"]` publishing wiring.
- Validated: `./gradlew :shared:publishToMavenLocal` now produces `~/.m2/repository/xyz/self/sdk/shared-android/0.1.0/shared-android-0.1.0.aar`.
- Completed (Android wiring): RN test app resolves `implementation("xyz.self.sdk:shared:0.1.0")` through `shared-android` with `mavenLocal()` enabled.
- Completed (Android scanner rewrite): `SelfMrzScannerActivity` now delegates scan/progress to `CameraMrzBridgeHandler.scanMrzWithPreview(...)`; local `SelfMrzParser.kt` removed.
- Completed (Android dependency cleanup): direct CameraX/ML Kit dependencies removed from RN test app; `camera-view` kept as `compileOnly` for `PreviewView` compile access while runtime deps come from SDK artifact.
- Completed (error-code contract): `SelfMrzScannerActivity` propagates `EXTRA_ERROR_CODE` on all failure paths (`MRZ_SCAN_FAILED`, `MRZ_SCAN_INVALID_RESULT`, `CAMERA_PERMISSION_DENIED`) so `SelfMRZScannerModule` can forward specific error codes to JS.

### PR 2 — Infra-A + iOS Consolidation

- Completed (Infra-A): AGP aligned to 8.11.2 across `kmp-sdk`, `kmp-sdk-test-app`, and `kmp-minipay-sample`. Added `includeBuild('../../kmp-sdk')` to RN test app `settings.gradle`. Removed `mavenLocal()`. Kotlin version mismatch (RN 2.0.0 vs KMP 2.1.0) was not a blocker — composite builds isolate plugin classpaths.
- Validated (Infra-A): `dependencyInsight` confirms `project :kmp-sdk:shared (by composite build)`. All five consumers build: KMP SDK, kmp-sdk-test-app, kmp-minipay-sample, RN test app (Android).
- Completed (iOS scanner rewrite): `SelfMRZScannerModule.swift` rewritten to delegate to `MrzCameraHelper` from `SelfSdkSwift`. Local `SelfMrzSwiftParser`, `SelfMrzSwiftResult`, and Vision-based sample-buffer pipeline removed. RN bridge contract preserved (`MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `CAMERA_PERMISSION_DENIED`).
- Completed (iOS SPM wiring): Local SPM package reference added for `../../self-sdk-swift` in `project.pbxproj`. Hand-written UUIDs replaced with random IDs.
- Pending: iOS `xcodebuild` verification requires local machine with SSH access to `git@github.com:selfxyz/NFCPassportReader.git`.

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

| File                                                                                               | Issue                                                                                                             | Status            |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------- |
| `packages/rn-sdk-test-app/android/app/src/main/java/com/selfxyz/demoapp/SelfMrzParser.kt`          | Duplicates MRZ extraction, parsing, and detection-state logic already available in SDK-side implementation.       | Removed (PR 1)    |
| `packages/rn-sdk-test-app/android/app/src/main/java/com/selfxyz/demoapp/SelfMrzScannerActivity.kt` | Duplicates CameraX + ML Kit scan pipeline; should delegate to SDK handler logic while keeping local overlay UX.   | Rewritten (PR 1)  |
| `packages/rn-sdk-test-app/ios/SelfRNTestApp/SelfMRZScannerModule.swift`                            | Contains local parser + detection enum that duplicate Swift SDK helper behavior.                                  | Pending           |
| `packages/rn-sdk-test-app/android/app/build.gradle`                                                | Declares CameraX/ML Kit deps locally despite these being available from SDK `shared` module once wiring is fixed. | Cleaned up (PR 1) |
| `packages/rn-sdk-test-app/android/settings.gradle`                                                 | Missing `includeBuild("../../kmp-sdk")` wiring for local dependency substitution.                                 | Pending (Infra-A) |
| `packages/rn-sdk-test-app/ios/SelfRNTestApp.xcodeproj/project.pbxproj`                             | Missing local SPM dependency for `../../self-sdk-swift`.                                                          | Pending           |

## Design Principles

1. **Keep RN bridge contract stable.** `SelfMRZScannerModule` cancellation and success payloads remain unchanged (`MRZ_SCAN_CANCELLED`, `documentNumber`, `dateOfBirth`, `dateOfExpiry`).
2. **Reuse SDK-native logic, mimic KMP test app UX.** Keep RN scanner UI behavior aligned with KMP test app (frame geometry, color-state mapping, instruction copy, pulse behavior, cancel affordance), while delegating camera/OCR/parsing/detection internals to SDK helper classes.
3. **No scope creep into production SDK packages.** This follow-up is test-app integration cleanup, not a bridge protocol or `@selfxyz/rn-sdk` API change.

## Scope of Work

### Chunk MRZ-Infra-A: Composite Build Compatibility Gate (done, PR 2)

**Status: Done.**

Resolved by bumping AGP from 8.7.3 → 8.11.2 across `kmp-sdk`, `kmp-sdk-test-app`, and `kmp-minipay-sample`. Kotlin version mismatch (RN 2.0.0 vs KMP 2.1.0) was not a blocker — composite builds isolate each project's Kotlin plugin classpath. `includeBuild('../../kmp-sdk')` added to RN test app `settings.gradle`, `mavenLocal()` removed from `build.gradle`. Dependency insight confirms resolution `by composite build`.

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

### Chunk MRZ-Consolidation-iOS: iOS Scanner Consolidation (done, PR 2)

**Status: Done.**

- Local SPM package `../../self-sdk-swift` added to `project.pbxproj`.
- `SelfMRZScannerModule.swift` rewritten to delegate to `MrzCameraHelper` from `SelfSdkSwift`. Local `SelfMrzSwiftParser`, `SelfMrzSwiftResult`, and Vision-based sample-buffer pipeline removed. Local `MrzDetectionState` enum retained as UI-only mapping from SDK's `Int` state indices to colors/instruction copy.
- RN bridge contract preserved: `MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `CAMERA_PERMISSION_DENIED`.
- Scanner UX overlay/copy/colors/pulse/cancel aligned with KMP test app.
- **Verified:** iOS `xcodebuild` build succeeds. SPM link persists after `pod install`. NFCPassportReader resolves via SSH.

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

| Test                                    | Type   | What it validates                                                                                                                                                | Status         |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `rn-test-app.android-assemble`          | Build  | Android app builds with composite build SDK dependency.                                                                                                          | Pass           |
| `rn-test-app.android-dep-insight`       | Build  | `dependencyInsight` confirms `project :kmp-sdk:shared (by composite build)`.                                                                                     | Pass           |
| `rn-test-app.android-runtime-classpath` | Build  | SDK artifact/variant resolution includes expected camera stack.                                                                                                  | Pass           |
| `kmp-sdk.assembleRelease`               | Build  | KMP SDK builds with AGP 8.11.2.                                                                                                                                  | Pass           |
| `kmp-sdk.jvmTest`                       | Build  | KMP SDK unit tests pass after AGP bump.                                                                                                                          | Pass           |
| `kmp-sdk-test-app.assembleDebug`        | Build  | KMP test app builds with AGP 8.11.2.                                                                                                                             | Pass           |
| `kmp-minipay-sample.assembleDebug`      | Build  | Minipay sample builds with AGP 8.11.2.                                                                                                                           | Pass           |
| `rn-test-app.ios-build`                 | Build  | Local `self-sdk-swift` SPM package is linked and compiles.                                                                                                       | Pass           |
| `camera.cancelled.android`              | Manual | Cancellation still maps to `MRZ_SCAN_CANCELLED`.                                                                                                                 | Pass           |
| `camera.cancelled.ios`                  | Manual | Cancellation still maps to `MRZ_SCAN_CANCELLED`.                                                                                                                 | Pending        |
| `camera.success.android`                | Manual | Returns required MRZ fields with delegated handler logic.                                                                                                        | Pass           |
| `camera.success.ios`                    | Manual | Returns required MRZ fields with delegated helper logic.                                                                                                         | Pending        |
| `camera.error-codes.contract`           | Unit   | Native modules produce exact same error codes before/after rewrite (`MRZ_SCAN_CANCELLED`, `MRZ_SCAN_FAILED`, `MRZ_SCAN_IN_PROGRESS`, `MRZ_SCAN_INVALID_RESULT`). | Pass (Android) |

## PR Strategy (final)

1. **PR 1 (merged):** Infra-B (publication fix) + Android MRZ consolidation via `mavenLocal()`.
2. **PR 2 (this PR):** Infra-A (composite build via AGP alignment) + iOS MRZ consolidation (SPM wiring + scanner rewrite).

## Explored Paths

| Approach                                             | Result                                                     | Root cause / resolution                                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeBuild("../../kmp-sdk")` in `settings.gradle` | BUILD FAILED (2026-03-05)                                  | AGP 8.7.3 vs 8.11.2 — Gradle forbids mixed AGP in composite builds. **Resolved** by bumping KMP SDK AGP to 8.11.2.                                        |
| `publishToMavenLocal` + `mavenLocal()` repo          | Resolves metadata module only, no Android AAR (2026-03-05) | KMP SDK `afterEvaluate` publishing block references `components["release"]` which is null. **Resolved** by Infra-B (`publishLibraryVariants("release")`). |
| `publishReleasePublicationToMavenLocal` explicitly   | Produces empty POM, no AAR (2026-03-05)                    | Same root cause — no Android component registered. **Resolved** by Infra-B.                                                                               |
| Bump RN test app Kotlin to 2.1.0                     | BUILD FAILED (2026-03-05)                                  | KGP 2.1.0 has binary-incompatible API change vs RN 0.76.9 Gradle plugin. **Not needed** — composite builds isolate Kotlin plugin classpaths.              |

## Definition of Done

- [x] Duplicate MRZ parser logic removed from RN test app Android (`SelfMrzParser.kt`).
- [x] Android scanner module is a thin wrapper around `CameraMrzBridgeHandler`.
- [x] Error-code contract preserved on all Android failure paths.
- [x] Android build passes with composite build SDK dependency.
- [x] Duplicate MRZ parser logic removed from RN test app iOS (Swift parser/state types).
- [x] iOS scanner module is a thin wrapper around `MrzCameraHelper`.
- [x] iOS build passes with local SPM package linked.
- [x] `mavenLocal()` replaced with composite build (Infra-A).
