# KMP Callback Contract Alignment

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-shells
- Backlog IDs: NS-06
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- `kmp-sdk` still exposes a non-canonical public `VerificationResult` shape (`type` and string-only `claims`).
- `NS-01` confirmed the mismatch is narrow and isolated to KMP callback/result handling.
- Publishing readiness should not absorb a public contract cleanup.

## Scope

- Align the public KMP `VerificationResult` model with the canonical SDK contract from [SDK Overview](../../OVERVIEW.md).
- Preserve current host-app success/cancel/error behavior for lifecycle result delivery.
- Isolate legacy flat lifecycle `{ type }` payload handling to transport compatibility instead of the public result contract.
- Update native-shells backlog/status docs to reflect the alignment work and any remaining follow-up.

## Out of Scope

- Publishing artifacts.
- iOS Camera MRZ Phase 2.
- RN SDK contract redesign.
- Unrelated bridge protocol changes.

## Files to Modify

- `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/api/SelfSdkCallback.kt`
- `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/api/SelfSdk.android.kt`
- `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandler.kt`
- `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandler.kt`
- `packages/kmp-sdk/shared/src/commonTest/kotlin/xyz/self/sdk/models/ModelSerializationTest.kt`
- `specs/projects/sdk/workstreams/native-shells/SPEC.md`
- `specs/projects/sdk/OVERVIEW.md`

## Files Not to Modify

- `packages/mobile-sdk-alpha/**`
- `packages/webview-app/**`
- `packages/rn-sdk/**`

## Preconditions

- Canonical `VerificationResult` in [SDK Overview](../../OVERVIEW.md) remains the source of truth.
- Flat lifecycle payloads may still arrive from the embedded WebView bundle during compatibility period.

## Implementation Notes

- Preserve callback method names and launch flow behavior for host apps.
- For flat lifecycle payloads with only `type`, continue reporting success, but do not surface `type` on the public KMP result object.
- If lifecycle compatibility needs a longer-lived protocol shim, document it instead of widening the public API.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64
```

## Definition of Done

- [x] KMP public `VerificationResult` matches canonical fields
- [x] `claims` accepts canonical heterogeneous values
- [x] Flat lifecycle compatibility remains isolated from the public result type
- [x] Android and iOS KMP validation commands pass
- [x] Backlog/spec status updated

## Status Log

- 2026-03-10: Created from `NS-01` callback-contract audit follow-up.
- 2026-03-10: Removed public `VerificationResult.type`, widened `claims` to `Map<String, Any?>`, and kept flat lifecycle `{ type }` payload handling as an internal success shim on Android and iOS.
- 2026-03-10: Validation passed with `./gradlew :shared:jvmTest`, `./gradlew :shared:compileDebugKotlinAndroid`, and `./gradlew :shared:compileKotlinIosArm64`.
