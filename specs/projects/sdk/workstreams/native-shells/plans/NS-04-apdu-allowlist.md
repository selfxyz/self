# APDU Allowlist in KMP NFC Bridge Handler

> Last updated: 2026-03-10
> Status: Done

- Workstream: native-shells
- Backlog IDs: NS-04
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- The React Native SDK exposes raw APDU exchange, but the KMP NFC bridge should not accept caller-supplied APDU commands at all.
- This is a security boundary issue and should be resolved before broader rollout.

## Scope

- Reject caller-supplied `apduCommands` at the KMP NFC bridge boundary on Android and iOS.
- Add tests for allowed scan params and rejected APDU input.
- Update security hardening tracking to point at this plan.

## Out of Scope

- RN SDK APDU allowlist work
- iOS timeout handling
- payload minimization

## Files to Modify

- `packages/kmp-sdk/shared/src/commonMain/kotlin/xyz/self/sdk/handlers/NfcBridgeHandler.kt`
- related KMP test files
- `specs/projects/sdk/workstreams/native-shells/SPEC.md`

## Files Not to Modify

- `packages/rn-sdk/**`
- `packages/mobile-sdk-alpha/**`

## Preconditions

- Existing bridge request shape remains unchanged.

## Implementation Notes

- KMP does not expose a raw APDU/transceive API; the only allowed NFC path is the built-in passport `scan` flow.
- Reject `apduCommands` before tag/provider work begins.
- Avoid leaking raw APDU bytes in error messages.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
cd packages/kmp-sdk && ./gradlew :shared:compileDebugKotlinAndroid
cd packages/kmp-sdk && ./gradlew :shared:compileKotlinIosArm64
```

## Definition of Done

- [x] KMP APDU allowlist implemented
- [x] Reject-path tests added
- [x] Spec backlog updated

## Status Log

- 2026-03-10: Created from security hardening follow-up.
- 2026-03-10: Implemented a bridge-boundary APDU policy for KMP. Caller-supplied `apduCommands` are rejected on both platforms; only the built-in passport scan sequence is allowed.
