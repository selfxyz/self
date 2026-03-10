# Physical-Device Validation Matrix

> Last updated: 2026-03-10
> Status: Ready

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

- `specs/projects/sdk/workstreams/native-shells/SPEC.md`
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

- [ ] Android real-device NFC flow validated
- [ ] iOS real-device NFC flow validated
- [ ] Failure-path behavior documented
- [ ] Backlog row updated
- [ ] Follow-up bugs split into separate backlog items if needed

## Status Log

- 2026-03-10: Created from native-shells follow-up backlog.
