# MiniPay Sample Polish and Error Handling

> Last updated: 2026-03-10
> Status: Ready

- Workstream: integrations
- Backlog IDs: IN-01
- Owner: Integrations
- Branch: TBD
- PR: TBD

## Why

- Chunk 3C is still only partially complete in the sample app.
- This should be isolated from device-validation work.

## Scope

- Finish result-display polish and error handling for the sample app.
- Ensure the result UX reflects canonical error codes cleanly.

## Out of Scope

- physical-device NFC testing
- publishing

## Files to Modify

- `packages/kmp-minipay-sample/**`
- `specs/projects/sdk/paused/integrations/SPEC.md`

## Files Not to Modify

- `packages/kmp-sdk/**`
- `packages/mobile-sdk-alpha/**`

## Preconditions

- Launch and callback wiring remain stable.

## Validation

```bash
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileDebugKotlinAndroid
cd packages/kmp-minipay-sample && ./gradlew :composeApp:compileKotlinIosSimulatorArm64
```

## Definition of Done

- [ ] Chunk 3C polish items are complete
- [ ] Validation commands pass
- [ ] Backlog row updated

## Status Log

- 2026-03-10: Created during spec refactor.
