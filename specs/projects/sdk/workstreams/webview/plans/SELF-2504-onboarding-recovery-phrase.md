# SELF-2504: Add Recovery Phrase Screen To Post-Registration Onboarding

> Last updated: 2026-04-02
> Status: In Progress
> Priority: High
> Depends on: WV-09, WV-12

- Workstream: webview
- Linear: SELF-2504
- Owner: TBD
- Branch: `self-2504`
- PR: TBD

## Why

The post-registration onboarding flow currently skips the recovery phrase
screen, even though the webview app already has a wrapper for Euclid's
`RecoveryPhraseScreen`. Users should see their recovery phrase immediately
after registration succeeds, before the notification prompt.

## Scope

- add `/onboarding/recovery-phrase`
- route registration success to that screen instead of `/onboarding/backup`
- advance from onboarding recovery phrase to `/onboarding/notifications`
- load the mnemonic from the same storage key used by `secretManager`
- preserve prompt mock query state through the updated onboarding chain

## Out Of Scope

- social sign-on or cloud backup integration
- redesigning Euclid's recovery phrase UI
- changing the standalone settings recovery flow beyond sharing the fixed
  mnemonic-loading logic

## Required Files

- `packages/webview-app/src/App.tsx`
- `packages/webview-app/src/screens/onboarding/ScanSuccessScreen.tsx`
- `packages/webview-app/src/screens/onboarding/PushNotificationPromptScreen.tsx`
- `packages/webview-app/src/screens/recovery/RecoveryPhraseScreen.tsx`
- `packages/webview-app/tests/screens/onboarding/registrationPrompts.test.tsx`
- `packages/webview-app/tests/screens/recovery/recoveryPhraseScreen.test.tsx`

## Implementation Notes

- Reuse the existing `RecoveryPhraseScreen` wrapper logic instead of creating a
  separate screen implementation from scratch.
- Fix the wrapper to read the mnemonic from `self_mnemonic`, which is the key
  written by `packages/webview-app/src/utils/secretManager.ts`.
- Accept both raw mnemonic strings and legacy JSON payloads when parsing stored
  values.
- Use the existing recovery phrase action buttons as the temporary onboarding
  exit to the notification prompt. Do not reintroduce the backup method picker
  into the registration success chain for this slice.

## Validation

```bash
cd packages/webview-app && yarn test --run tests/screens/onboarding/registrationPrompts.test.tsx tests/screens/recovery/recoveryPhraseScreen.test.tsx && yarn build
```
