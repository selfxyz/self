# LifecycleBridgeHandler Type and Error Semantics

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-shells
- Backlog IDs: NS-05
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- The current iOS lifecycle handler behavior may drop error fields when `type` is present.
- The intended contract should be explicit before more integrations rely on it.

## Scope

- Decide whether lifecycle payloads with `type` may also carry error semantics.
- Implement the chosen behavior or document/assert the invariant.
- Add or update tests.

## Out of Scope

- Broader lifecycle redesign
- Lifecycle payload format redesign beyond preserving existing error/cancel semantics

## Files to Modify

- `packages/kmp-sdk/shared/src/iosMain/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandler.kt`
- `packages/kmp-sdk/shared/src/androidMain/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandler.kt`
- `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/handlers/LifecycleSetResultOutcome.kt`
- `packages/kmp-sdk/shared/src/commonTest/kotlin/xyz/self/sdk/handlers/LifecycleBridgeHandlerTest.kt`
- `specs/projects/sdk/paused/native-shells/SPEC.md`

## Files Not to Modify

- `packages/rn-sdk/**`
- `packages/webview-app/**`

## Preconditions

- Current callback contract in `OVERVIEW.md` remains canonical.

## Implementation Notes

- Prefer an explicit contract decision over silent current behavior.
- If behavior changes, note the compatibility impact in the PR.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64
```

## Definition of Done

- [x] Lifecycle type/error contract is explicit
- [x] Tests or assertions reflect the chosen behavior
- [x] Backlog row updated
- [x] Android and iOS route flat lifecycle payloads identically

## Status Log

- 2026-03-10: Created from security hardening follow-up.
- 2026-03-10: Completed. Extracted shared lifecycle outcome routing, updated Android and iOS handlers to honor flat-payload error/cancel semantics, added common tests for success/failure/cancel branches, and marked NS-05 done in the workstream spec.
