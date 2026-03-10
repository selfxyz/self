# APDU Allowlist in KMP NFC Bridge Handler

> Last updated: 2026-03-10
> Status: Ready

- Workstream: native-shells
- Backlog IDs: NS-04
- Owner: Native Shells
- Branch: TBD
- PR: TBD

## Why

- The NFC bridge currently accepts APDU commands from the WebView without allowlist validation.
- This is a security boundary issue and should be resolved before broader rollout.

## Scope

- Add APDU command-prefix allowlisting to the KMP NFC bridge handler.
- Add tests for rejected commands.
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

- Allow only eMRTD command families needed for passport reading.
- Reject before transceive.
- Avoid leaking raw APDU bytes in error messages.

## Validation

```bash
cd packages/kmp-sdk && ./gradlew :shared:jvmTest
```

## Definition of Done

- [ ] KMP APDU allowlist implemented
- [ ] Reject-path tests added
- [ ] Spec backlog updated

## Status Log

- 2026-03-10: Created from security hardening follow-up.
