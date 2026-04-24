# App-Only Dev Recovery Circuit Test Flow

> Last updated: 2026-04-23
> Status: Ready
> Scope: Mobile app only (`app/`)

## Why

Ayman wants a local-dev-only way to exercise the real on-chain proving flow
from the mobile app while working with documents that are already registered.

The existing mobile app already has:

- a real register proving flow
- a recovery flow
- app-level navigation from proving into recovery

What it does **not** have is an app-only developer harness that intentionally
uses the existing recovery path and then resumes into the existing app proving
surface for local circuit testing.

This feature must remain app-only. It must not require any changes under
`packages/`.

## Exception Note

`CLAUDE.md` says app-only work can use a Linear issue without a repo spec.
This file is an explicit exception because the flow needs careful local-dev
constraints and handoff detail before implementation. It is intentionally kept
at `specs/` root rather than under an SDK workstream because the feature is
not package-owned.

## Scope

### In scope

- `app/` only
- local development only
- dev settings / debug shortcut entry
- recovery-flow routing for local testing
- resuming into existing app proving screens after recovery
- app tests for the new dev-only flow

### Out of scope

- any changes under `packages/`
- `packages/mobile-sdk-alpha/**`
- WebView, KMP, or native-shell work
- production or staged rollout support
- backend / relayer changes

## Product Decision

This is a **developer test harness**, not a product flow change.

The harness should only exist in local dev mode and must be invisible in
production builds.

## Existing App Behavior

- `app/src/providers/selfClientProvider.tsx`
  - listens for `PROVING_ACCOUNT_RECOVERY_REQUIRED`
  - navigates to `AccountRecoveryChoice`
- `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx`
  - recovery currently ends at `AccountVerifiedSuccess`
- `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx`
  - phrase recovery currently ends at `AccountVerifiedSuccess`
- `app/src/screens/app/LoadingScreen.tsx`
  - starts the app's existing real proving flow

## Required Behavior

When the local dev harness is enabled:

1. The developer can enable the harness from app-only dev settings.
2. The harness does **not** change how recovery is initially triggered. The
   existing SDK event `PROVING_ACCOUNT_RECOVERY_REQUIRED` continues to send
   the app into recovery for already-registered / recovery-required cases.
3. After successful recovery, the app resumes into the existing proving UI
   instead of stopping at `AccountVerifiedSuccess`.
4. When the harness is disabled, current app behavior remains unchanged.

## Important Constraint

This spec is intentionally app-only, so it must work with the existing SDK
behavior exactly as it is.

That means:

- the app may reuse the existing recovery routing
- the app may resume into the existing proving screens
- but the app must **not** add any new proving-machine override, bypass, or
  force-prove behavior inside `packages/mobile-sdk-alpha`

If local testing later proves that app-only routing is insufficient because
the shared proving engine short-circuits the already-registered path before
the circuits run, that limitation must be documented in the PR and addressed
in a separate package-scoped follow-up. Do not solve that in this feature.

Developers using this harness must already have a previously registered
document for the recovery path they are testing. Without that prerequisite,
the flow will not reach the recovery-required branch.

## Design

### 1. Gate locally in app dev settings

Use existing app-local dev patterns:

- `app/src/utils/devUtils.ts`
- `IS_DEV_MODE`
- dev settings UI in `app/src/screens/dev/`
- persisted app settings in `app/src/stores/settingStore.ts`

Decision:

- add a persisted boolean to `useSettingStore`
- name it `enableRecoveryCircuitTestFlow`
- add a setter `setEnableRecoveryCircuitTestFlow`
- persist it under the existing `setting-storage` Zustand store
- surface the toggle in
  `app/src/screens/dev/sections/DevTogglesSection.tsx`
- wire it through `app/src/screens/dev/DevSettingsScreen.tsx`
- follow the existing StrongBox prop flow:
  `DevSettingsScreen` reads the store values and passes them into
  `DevTogglesSection` via explicit props
- extend `DevTogglesSectionProps`; do not read `useSettingStore` directly
  inside `DevTogglesSection`

Suggested label:

`Enable recovery-to-proving circuit test flow`

Requirements:

- only visible when `IS_DEV_MODE`
- forced effectively off in non-dev builds by not rendering the toggle and by
  never branching on it unless `IS_DEV_MODE` is also true
- clearly labeled as a circuit-testing tool
- render on both iOS and Android; do not copy the existing
  `Platform.OS === 'android'` wrapper used by the StrongBox toggle
- because sibling toggles are not sufficient precedent for visibility, add an
  explicit `IS_DEV_MODE` guard for this toggle itself even if `DevSettings`
  remains reachable in production

### 2. Keep recovery UI unchanged

Reuse the existing app recovery screens:

- `AccountRecoveryChoiceScreen`
- `RecoverWithPhraseScreen`

Do not create new dev-only recovery screens.

### 3. Change only the post-recovery destination

When the harness is enabled and recovery succeeds:

- default path: keep navigating to `AccountVerifiedSuccess`
- harness path: navigate directly to `LoadingScreen`

Decision:

- `AccountVerifiedSuccess` is skipped entirely in the harness path
- no intermediate success flash is shown
- the branch lives directly in both recovery screens:
  - `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx`
  - `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx`
- for this entrypoint, navigate to `LoadingScreen` with no additional params
  unless implementation proves that existing proving startup requires them
- do not invent new `LoadingScreen` route params for this feature unless code
  inspection during implementation shows they are strictly required

This reuses `LoadingScreen` and existing proving UI rather than adding a new
dev-only proving surface.

### 4. Add a small debug entry surface

Decision:

- add a shortcut button in
  `app/src/screens/dev/sections/DebugShortcutsSection.tsx`
- follow the existing `Test Referral Flow` pattern exactly:
  `IS_DEV_MODE` gated button + `navigation.navigate(...)`

The shortcut is a convenience entry into the app-owned test setup. It does not
replace the existing SDK-driven recovery trigger. Its job is to help the
developer get to the relevant app screens quickly.

Requirements:

- hidden outside dev mode
- clearly labeled for local circuit testing
- must not require any changes to `selfClientProvider.tsx`

Suggested label:

`Recovery Circuit Test Flow`

## Files You May Modify

| File | Role |
| ---- | ---- |
| `app/src/stores/settingStore.ts` | persist `enableRecoveryCircuitTestFlow` and setter |
| `app/src/screens/dev/DevSettingsScreen.tsx` | wire persisted toggle into dev settings |
| `app/src/screens/dev/sections/DevTogglesSection.tsx` | render the new toggle |
| `app/src/screens/dev/sections/DebugShortcutsSection.tsx` | add debug shortcut |
| `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx` | app-only harness routing after recovery |
| `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx` | app-only harness routing after recovery |
| `app/src/screens/app/LoadingScreen.tsx` | unchanged proving destination surface; modify only if route params are truly required |

## Files You Will NOT Modify

| File | Why |
| ---- | --- |
| `packages/mobile-sdk-alpha/**` | feature is app-only |
| `packages/webview-app/**` | out of scope |
| `app/src/providers/selfClientProvider.tsx` | existing recovery trigger wiring stays unchanged |
| backend / relayer code | out of scope |

## Exact App Behavior

### Harness off

- already-registered / recovery-required case enters recovery exactly as it
  does today
- successful recovery navigates to `AccountVerifiedSuccess`

### Harness on

- already-registered / recovery-required case still enters recovery via the
  existing `PROVING_ACCOUNT_RECOVERY_REQUIRED` path
- successful recovery navigates directly to `LoadingScreen`
- `AccountVerifiedSuccess` is not shown first

## Test Plan

Add app tests that assert only routing behavior:

1. `AccountRecoveryChoiceScreen`
   - harness on + successful recovery => navigates to `LoadingScreen`
   - harness off + successful recovery => navigates to `AccountVerifiedSuccess`
2. `RecoverWithPhraseScreen`
   - harness on + successful recovery => navigates to `LoadingScreen`
   - harness off + successful recovery => navigates to `AccountVerifiedSuccess`
3. Dev settings
   - toggle renders only when `IS_DEV_MODE`
   - non-dev mode cannot turn the feature on through UI
4. Settings store
   - add one direct state test:
     `setEnableRecoveryCircuitTestFlow(true)` =>
     `useSettingStore.getState().enableRecoveryCircuitTestFlow === true`

## Validation

```bash
yarn workspace @selfxyz/mobile-app test
yarn workspace @selfxyz/mobile-app types
```

Manual local validation:

1. Enable the local harness in dev settings.
2. Use a document that was previously registered so the app can reach the
   existing recovery-required path.
3. Start the app-only test flow from the debug shortcut or normal app path.
4. Complete recovery successfully.
5. Confirm the app navigates directly to `LoadingScreen`.
6. Disable the harness.
7. Confirm recovery returns to `AccountVerifiedSuccess` again.

## Definition Of Done

- [ ] The harness is app-only and local-dev-only
- [ ] No files under `packages/` are modified
- [ ] The toggle is only reachable in dev builds
- [ ] Production builds cannot enable or reach the harness through app UI
- [ ] Recovery success navigates directly to `LoadingScreen` when the harness
      is enabled
- [ ] Recovery success still returns to `AccountVerifiedSuccess` when the
      harness is disabled
- [ ] App tests cover the new dev-only routing behavior
- [ ] Store test covers `setEnableRecoveryCircuitTestFlow`
