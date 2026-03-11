# MiniPay Sample Physical-Device NFC Validation

> Last updated: 2026-03-10
> Status: Ready

- Workstream: integrations
- Backlog IDs: IN-02
- Owner: Integrations
- Branch: TBD
- PR: TBD

## Why

- The sample app is still marked partial because physical-device NFC end-to-end validation remains.
- This is distinct from native-shell validation because it confirms consumer integration behavior.

## Scope

- Validate the sample on physical Android and iOS devices through the NFC flow.
- Confirm result callback semantics and result UX after real-device verification.

## Out of Scope

- sample polish work
- KMP SDK implementation changes unless split into follow-up bugs

## Files to Modify

- `specs/projects/sdk/paused/integrations/SPEC.md`
- validation notes as needed

## Files Not to Modify

- runtime code unless a separate bugfix plan is created

## Preconditions

- IN-01 is complete or explicitly waived.
- KMP native-shell device validation is available as reference.

## Validation

```bash
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileDebugKotlinAndroid
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileKotlinIosSimulatorArm64
```

## Definition of Done

- [ ] Physical-device NFC E2E recorded for Android
- [ ] Physical-device NFC E2E recorded for iOS
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec refactor.
