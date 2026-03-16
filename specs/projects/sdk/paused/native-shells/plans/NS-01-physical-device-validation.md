# Physical-Device Validation Matrix

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-shells
- Backlog IDs: NS-01
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- The implementation spec marks the core KMP native-shell work complete, but the physical-device matrix is still open.
- NFC success and failure behavior on real Android and iOS devices is the highest remaining delivery risk for `kmp-sdk`.
- Publishing should not proceed until device validation evidence exists.

## Scope

- Define the Android and iOS device matrix for passport NFC validation.
- Validate success, cancellation, timeout/failure, and callback result semantics on both platforms.
- Record validation evidence and any protocol or handler mismatches.

## Out of Scope

- Implementing iOS Camera MRZ Phase 2.
- Publishing artifacts.
- RN SDK host-app validation.

## Files to Modify

- `specs/projects/sdk/paused/native-shells/SPEC.md`
- `specs/projects/sdk/OVERVIEW.md`
- any validation log or handoff doc created by this PR

## Files Not to Modify

- `packages/mobile-sdk-alpha/**`
- `packages/webview-app/**`

## Preconditions

- The Vite bundle is available for embedding into the KMP test app.
- Android and iOS test apps build and launch on simulator/emulator before device testing begins.

## Implementation Notes

- Test against bridge protocol and callback contract, not against screen-level UI details.
- Capture both success and expected failure paths.
- If device validation reveals implementation bugs, open a separate plan/PR per bug instead of broadening this PR.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64
cd packages/self-sdk-swift && swift build
```

## Definition of Done

- [x] Android real-device NFC flow validated
- [x] iOS real-device NFC flow validated
- [x] Failure-path behavior documented
- [x] Backlog row updated
- [x] Follow-up bugs split into separate backlog items if needed

## Validation Evidence

### Build Gates

| Command                                                              | Result | Evidence                                                                                                                                          |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cd packages/kmp-sdk && ./gradlew :shared:jvmTest`                   | Pass   | 2026-03-10 local run succeeded (`UP-TO-DATE`)                                                                                                     |
| `cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid` | Pass   | 2026-03-10 local run succeeded (`UP-TO-DATE`)                                                                                                     |
| `cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64`     | Pass   | 2026-03-10 local run succeeded; only Kotlin `expect/actual` beta warnings emitted                                                                 |
| `cd packages/self-sdk-swift && swift build`                          | Fail   | 2026-03-10 local run failed while compiling `NFCPassportReader`: `OpenSSL.framework/Headers/ssl.h:15:11: error: 'openssl/e_os2.h' file not found` |

### Real-Device Validation

| Platform | Result | Evidence                                                                                                       |
| -------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Android  | Pass   | 2026-03-10 operator-confirmed real-device NFC success path and failure path both completed in the KMP test app |
| iOS      | Pass   | 2026-03-10 operator-confirmed real-device NFC success path and failure path both completed in the KMP test app |

### Callback Contract Audit

- Canonical contract in `specs/projects/sdk/OVERVIEW.md` allows `success`, `userId`, `verificationId`, `proof`, `claims`, and optional `error`, with `claims` typed as `Record<string, unknown>` / `Map<String, Any?>`.
- KMP public type in `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/api/SelfSdkCallback.kt` still exposes `type: String?` and narrows `claims` to `Map<String, String>?`.
- Both Android and iOS lifecycle handlers currently treat flat payloads with `type` as `onSuccess`, which matches RN shell behavior, but that `type` field is not part of the canonical `VerificationResult` contract.
- Follow-up item `NS-06` tracks aligning KMP lifecycle/result semantics with the canonical SDK contract; NS-01 does not widen into that implementation work.

## Failure-Path Matrix

| Platform | Scenario                    | Observed / inferred behavior                                                                                                                 | Source                                                                         |
| -------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Android  | NFC unsupported             | `isSupported()` returns `false` when adapter missing or disabled; `scan()` throws `NFC_NOT_SUPPORTED` if no adapter exists                   | `packages/kmp-sdk/shared/src/androidMain/.../NfcBridgeHandler.kt`              |
| Android  | NFC disabled                | `scan()` throws `NFC_NOT_ENABLED` before reader mode is enabled                                                                              | `packages/kmp-sdk/shared/src/androidMain/.../NfcBridgeHandler.kt`              |
| Android  | Non-passport tag            | `scan()` throws `NFC_NOT_ISO_DEP` when detected tag lacks `IsoDep`                                                                           | `packages/kmp-sdk/shared/src/androidMain/.../NfcBridgeHandler.kt`              |
| Android  | Auth failure                | `readPassport()` throws `AUTH_FAILED` if both PACE and BAC fail                                                                              | `packages/kmp-sdk/shared/src/androidMain/.../NfcBridgeHandler.kt`              |
| Android  | User dismiss                | Host callback is `onCancelled()` only when lifecycle `dismiss` / cancelled result path runs; NFC bridge failure alone does not end host flow | `LifecycleBridgeHandler.kt`, `SelfSdk.android.kt`                              |
| iOS      | Provider missing            | `scan()` throws `NOT_CONFIGURED`                                                                                                             | `packages/kmp-sdk/shared/src/iosMain/.../NfcBridgeHandler.kt`                  |
| iOS      | Invalid params              | `scan()` throws `MISSING_PASSPORT_NUMBER`, `MISSING_DOB`, or `MISSING_EXPIRY`                                                                | `packages/kmp-sdk/shared/src/iosMain/.../NfcBridgeHandler.kt`                  |
| iOS      | Scan failure                | Provider error maps to `NFC_SCAN_FAILED`                                                                                                     | `packages/kmp-sdk/shared/src/iosMain/.../NfcBridgeHandler.kt`                  |
| iOS      | Simulator / unavailable NFC | Swift helper returns `completion(false, "NFC is not available on simulator")`; Kotlin surfaces `NFC_SCAN_FAILED`                             | `packages/self-sdk-swift/Sources/SelfSdkSwift/Helpers/NfcPassportHelper.swift` |
| iOS      | Concurrent scan             | Swift provider returns `onError("A scan is already in progress")`; Kotlin surfaces `NFC_SCAN_FAILED`                                         | `packages/self-sdk-swift/Sources/SelfSdkSwift/Providers/NfcProviderImpl.swift` |
| iOS      | User dismiss                | Host callback is `onCancelled()` only when lifecycle `dismiss` / cancelled result path runs; NFC bridge failure alone does not end host flow | `LifecycleBridgeHandler.kt`, `SelfSdk.ios.kt`                                  |

## Notes

- `cd packages/self-sdk-swift && swift build` still fails in this environment because the `NFCPassportReader` dependency cannot compile against the local OpenSSL headers. This did not block iOS device validation via Xcode/workspace build.
- `NS-06` remains open because KMP callback/result shapes still diverge from the canonical `VerificationResult` contract even though observed launch/result semantics were acceptable during device validation.

## Status Log

- 2026-03-10: Created from native-shells follow-up backlog.
- 2026-03-10: Ran KMP build gates, audited callback semantics, and checked local device availability. Marked blocked because no usable Android/iOS hardware is currently available and `packages/self-sdk-swift` fails `swift build` locally on missing OpenSSL headers.
- 2026-03-10: Completed operator-assisted real-device NFC validation on Android and iOS for both success and failure paths. Marked `NS-01` done; retained `NS-06` as the follow-up contract-alignment item and kept the local `swift build` OpenSSL issue documented as an environment gap.
