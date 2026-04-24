# Dev Recovery Circuit Test Flow

> Last updated: 2026-04-23
> Status: Phase 1 shipped; Phase 2 ready
> Scope: Phase 1 — mobile app only (`app/`); Phase 2 — `app/` + `packages/mobile-sdk-alpha`

## Phase Overview

This spec has been split into phases because Phase 1 shipped without
exercising the register circuit. It is preserved below as historical state.

- **Phase 1 — App-only recovery-resume harness (shipped).** Routes
  successful recovery into `LoadingScreen` so proving UI resumes. Does
  **not** exercise the register circuit, because by the time recovery
  succeeds the SDK proving machine has already taken the
  recovery-required branch and the register circuit never runs. See
  [Phase 1](#phase-1--app-only-recovery-resume-harness-shipped).
- **Phase 2 — Register-circuit bypass harness (next).** Enters via
  scanning, suppresses the recovery navigation, and forces the
  proving machine to continue as register so the register circuit
  runs locally and the on-chain tx fails naturally. Departs from
  Phase 1's app-only constraint by adding a small SDK-side flag.
  See [Phase 2](#phase-2--register-circuit-bypass-harness-next).

## Phase 1 — App-only recovery-resume harness (shipped)

> **Historical note.** Phase 1 shipped on `justin/mobile-circuit-qa-mode`
> as described below. After review it was found to not exercise the
> register circuit: the debug shortcut jumps directly into
> `AccountRecoveryChoice`, skipping scanning, and the post-recovery
> resume into `LoadingScreen` does not cause the register circuit to
> run because the proving machine has already taken the
> recovery-required branch. Phase 2 replaces the mechanism; the Phase 1
> toggle, store field, and debug shortcut are retained and repurposed.

### Why

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

### Exception Note

`CLAUDE.md` says app-only work can use a Linear issue without a repo spec.
This file is an explicit exception because the flow needs careful local-dev
constraints and handoff detail before implementation. It is intentionally kept
at `specs/` root rather than under an SDK workstream because the feature is
not package-owned.

### Scope

#### In scope

- `app/` only
- local development only
- dev settings / debug shortcut entry
- recovery-flow routing for local testing
- resuming into existing app proving screens after recovery
- app tests for the new dev-only flow

#### Out of scope

- any changes under `packages/`
- `packages/mobile-sdk-alpha/**`
- WebView, KMP, or native-shell work
- production or staged rollout support
- backend / relayer changes

### Product Decision

This is a **developer test harness**, not a product flow change.

The harness should only exist in local dev mode and must be invisible in
production builds.

### Existing App Behavior

- `app/src/providers/selfClientProvider.tsx`
  - listens for `PROVING_ACCOUNT_RECOVERY_REQUIRED`
  - navigates to `AccountRecoveryChoice`
- `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx`
  - recovery currently ends at `AccountVerifiedSuccess`
- `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx`
  - phrase recovery currently ends at `AccountVerifiedSuccess`
- `app/src/screens/app/LoadingScreen.tsx`
  - starts the app's existing real proving flow

### Required Behavior

When the local dev harness is enabled:

1. The developer can enable the harness from app-only dev settings.
2. The harness does **not** change how recovery is initially triggered. The
   existing SDK event `PROVING_ACCOUNT_RECOVERY_REQUIRED` continues to send
   the app into recovery for already-registered / recovery-required cases.
3. After successful recovery, the app resumes into the existing proving UI
   instead of stopping at `AccountVerifiedSuccess`.
4. When the harness is disabled, current app behavior remains unchanged.

### Important Constraint

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

### Design

#### 1. Gate locally in app dev settings

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

#### 2. Keep recovery UI unchanged

Reuse the existing app recovery screens:

- `AccountRecoveryChoiceScreen`
- `RecoverWithPhraseScreen`

Do not create new dev-only recovery screens.

#### 3. Change only the post-recovery destination

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

#### 4. Add a small debug entry surface

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

### Files You May Modify

| File                                                               | Role                                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `app/src/stores/settingStore.ts`                                   | persist `enableRecoveryCircuitTestFlow` and setter                                    |
| `app/src/screens/dev/DevSettingsScreen.tsx`                        | wire persisted toggle into dev settings                                               |
| `app/src/screens/dev/sections/DevTogglesSection.tsx`               | render the new toggle                                                                 |
| `app/src/screens/dev/sections/DebugShortcutsSection.tsx`           | add debug shortcut                                                                    |
| `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx` | app-only harness routing after recovery                                               |
| `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx`     | app-only harness routing after recovery                                               |
| `app/src/screens/app/LoadingScreen.tsx`                            | unchanged proving destination surface; modify only if route params are truly required |

### Files You Will NOT Modify

| File                                       | Why                                              |
| ------------------------------------------ | ------------------------------------------------ |
| `packages/mobile-sdk-alpha/**`             | feature is app-only                              |
| `packages/webview-app/**`                  | out of scope                                     |
| `app/src/providers/selfClientProvider.tsx` | existing recovery trigger wiring stays unchanged |
| backend / relayer code                     | out of scope                                     |

### Exact App Behavior

#### Harness off

- already-registered / recovery-required case enters recovery exactly as it
  does today
- successful recovery navigates to `AccountVerifiedSuccess`

#### Harness on

- already-registered / recovery-required case still enters recovery via the
  existing `PROVING_ACCOUNT_RECOVERY_REQUIRED` path
- successful recovery navigates directly to `LoadingScreen`
- `AccountVerifiedSuccess` is not shown first

### Test Plan

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

### Validation

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

### Definition Of Done

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

## Phase 2 — Register-circuit bypass harness (shipped)

> Implemented on `justin/mobile-circuit-qa-mode` on top of Phase 1.
> Section references below point to the final implementation.

### Why

Phase 1 did not exercise the register circuit. The circuit engineer
needs a way to run the register circuit locally on a document that is
already registered on-chain, and observe the on-chain register tx fail.
Recovery must be bypassed entirely because recovery short-circuits the
proving machine before the register circuit runs.

### Invariant Departure

Phase 2 intentionally departs from Phase 1's app-only constraint and
from the `CLAUDE.md` rule that dev harnesses should not require
package changes. The departure is justified because there is no
app-only way to stop the proving machine from taking the
recovery-required branch. This matches the follow-up anticipated in
Phase 1's "Important Constraint" section.

Parent docs impacted:

- this spec (Phase 1 "app-only" scope)

### Required Behavior

When the Phase 2 harness is enabled:

1. The developer starts from the normal scanning entrypoint, not
   recovery. The existing toggle
   `enableRecoveryCircuitTestFlow` in `useSettingStore` continues to
   gate the harness.
2. During scanning of an already-registered document, the SDK proving
   machine runs register proving end-to-end instead of emitting
   `PROVING_ACCOUNT_RECOVERY_REQUIRED`. The register circuit runs
   locally. The on-chain register tx is submitted and is expected to
   fail (the document is already registered). Failure is the
   observable signal that the circuit ran.
3. When the harness is disabled, current app and SDK behavior remain
   unchanged.

### Design

#### 1. Repurpose the debug shortcut

- `app/src/screens/dev/sections/DebugShortcutsSection.tsx`
- The existing `Recovery Circuit Test Flow` button must navigate to
  `CountryPicker` (defined in `app/src/navigation/documents.ts:83`),
  which is the first route in the normal scanning funnel
  (`CountryPicker` → `LogoConfirmation` → `DocumentOnboarding` →
  `DocumentCamera` / NFC). Do not navigate to `AccountRecoveryChoice`
  and do not invent a new entry route.
- Rename the button to `Register Circuit Test (scan)` so the label
  matches the behavior.

#### 2. Suppress the recovery navigation in the app

- `app/src/providers/selfClientProvider.tsx`
- In the `PROVING_ACCOUNT_RECOVERY_REQUIRED` listener, read
  `useSettingStore.getState().enableRecoveryCircuitTestFlow`. When
  true and `IS_DEV_MODE`, do not navigate to `AccountRecoveryChoice`.
  The SDK flag in step 3 is responsible for ensuring the event is
  either not emitted or not acted on; this listener guard is a
  belt-and-braces second line of defense.

#### 3. Add an SDK-side harness flag to bypass the recovery-required branch

- `packages/mobile-sdk-alpha/src/proving/provingMachine.ts`
- Add a harness-only flag named `forceRegisterOnAlreadyRegistered`.
- **Shape decision (as implemented):** the flag is a field on a new
  `ProvingInitOptions` object passed as the 4th parameter to
  `useProvingStore.init(selfClient, circuitType, userConfirmed?, options?)`.
  It is **not** a top-level SDK `Config` field, **not** on
  `Config.devConfig`, and **not** a mutable setter on the proving
  store. Rationale: the flag is per-proving-session, not a global
  SDK capability. The `ProvingInitOptions` type is exported from
  the SDK's public index so the app can import it.
- Default-off. `resetProvingState` sets
  `forceRegisterOnAlreadyRegistered: false` on every init; the flag
  only becomes `true` when `options.forceRegisterOnAlreadyRegistered === true`
  is passed explicitly.
- **Machine-state invariant (implemented at the emitter level, not
  the transition level):** with the flag on, the two places that
  would send the machine into `account_recovery_choice` are gated:
  - `validatingDocument` (the `isNullifierOnchain` branch): when the
    flag is on, skip the `ACCOUNT_RECOVERY_CHOICE` send and fall
    through to the normal validation-success path so the register
    circuit runs.
  - `handleStatusCode` in `internal/statusHandlers.ts`: when the
    flag is on and the TEE returns `status === 5` with
    `error_code === 'REGISTERED_COMMITMENT'`, downgrade the actor
    event from `PROVE_ALREADY_REGISTERED` to `PROVE_FAILURE` so the
    machine terminates in `failure` rather than
    `account_recovery_choice`.
  The state-machine transitions themselves are left untouched; the
  two emitters are the only code paths that reach
  `account_recovery_choice`, so gating them is sufficient.
- Wire the flag through from `app/` only when both `IS_DEV_MODE` and
  `enableRecoveryCircuitTestFlow` are true. The wiring lives in the
  `buildProvingInitOptions()` helper below.

#### 5. App-side flag wiring

- `app/src/proving/buildProvingInitOptions.ts` (new helper)
- Computes `{ forceRegisterOnAlreadyRegistered: IS_DEV_MODE && useSettingStore.getState().enableRecoveryCircuitTestFlow === true }`.
- Read-through-`getState()`, not a subscription. Two consumers
  (`LoadingScreen` inside `useEffect`, `selfClientProvider` inside
  an SDK event callback) need the current value at a specific
  instant without causing re-renders. Do **not** reintroduce the
  Phase 1 `useRecoveryCircuitTestFlowEnabled` hook.
- `app/src/screens/app/LoadingScreen.tsx` calls
  `buildProvingInitOptions()` once per focused init and passes the
  result as the 4th argument to `init(...)` on every code path
  (register, dsc, and the catch-branch fallback).
- The helper exists primarily to make the app→SDK propagation
  testable without rendering `LoadingScreen`; see the test plan.

#### 4. Revert Phase 1 recovery-screen routing

- `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx`
- `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx`
- These screens are no longer part of the harness path. Remove the
  Phase 1 harness branches that navigate to `LoadingScreen`. Leave
  the default recovery behavior (navigate to `AccountVerifiedSuccess`)
  in place. Update the Phase 1 harness-on tests to assert
  `AccountVerifiedSuccess` regardless of the toggle (they become
  Phase 1 regression tests).
- Delete `app/src/hooks/useRecoveryCircuitTestFlowEnabled.ts` and
  its test — the hook has no consumers in Phase 2 (both call sites
  use `getState()` directly, not a subscription).

### Files You May Modify

| File                                                         | Role                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `app/src/screens/dev/sections/DebugShortcutsSection.tsx`     | retarget debug shortcut to `CountryPicker`; rename label to `Register Circuit Test (scan)` |
| `app/src/providers/selfClientProvider.tsx`                   | gate the `PROVING_ACCOUNT_RECOVERY_REQUIRED` navigation on the harness toggle       |
| `app/src/screens/account/recovery/AccountRecoveryChoiceScreen.tsx` | revert Phase 1 harness branch                                                  |
| `app/src/screens/account/recovery/RecoverWithPhraseScreen.tsx`     | revert Phase 1 harness branch                                                  |
| `app/src/screens/app/LoadingScreen.tsx`                      | call `buildProvingInitOptions()` and pass options as 4th arg to `init(...)`         |
| `app/src/proving/buildProvingInitOptions.ts` (new)           | helper that reads `IS_DEV_MODE` + store toggle via `getState()`                     |
| `packages/mobile-sdk-alpha/src/proving/provingMachine.ts`    | add `ProvingInitOptions`, 4th param to `init`, persist flag, gate `validatingDocument` emitter |
| `packages/mobile-sdk-alpha/src/proving/internal/statusHandlers.ts` | accept `StatusHandlerOptions`, downgrade `REGISTERED_COMMITMENT` to `PROVE_FAILURE` when flag on |
| `packages/mobile-sdk-alpha/src/index.ts`                     | export `ProvingInitOptions`                                                         |
| associated tests under `app/tests/` and `packages/mobile-sdk-alpha/tests/` | statusHandlers downgrade, `validatingDocument` mirror test, propagation helper, selfClientProvider listener, DebugShortcutsSection, recovery-screen regression |
| `app/src/hooks/useRecoveryCircuitTestFlowEnabled.ts` + its test | **deleted** — replaced by `getState()` reads at the two call sites              |

### Files You Will NOT Modify

| File                                  | Why                                                                 |
| ------------------------------------- | ------------------------------------------------------------------- |
| `app/src/stores/settingStore.ts`      | reuse the Phase 1 store field and setter as-is                      |
| `app/src/screens/dev/DevSettingsScreen.tsx` | reuse the Phase 1 toggle wiring as-is                         |
| `app/src/screens/dev/sections/DevTogglesSection.tsx` | reuse the Phase 1 toggle as-is                         |
| `packages/webview-app/**`             | out of scope                                                        |
| `packages/kmp-sdk/**`                 | out of scope                                                        |
| backend / relayer code                | out of scope                                                        |

### Exact Behavior

#### Harness off

- scanning of an already-registered document emits
  `PROVING_ACCOUNT_RECOVERY_REQUIRED` as today
- app navigates to `AccountRecoveryChoice`
- successful recovery navigates to `AccountVerifiedSuccess`

#### Harness on

- scanning of an already-registered document does **not** emit
  (or does emit but is ignored by) `PROVING_ACCOUNT_RECOVERY_REQUIRED`
- register proving runs locally; register circuit executes
- on-chain register tx is submitted and fails because the document is
  already registered
- app surfaces the proving/on-chain failure through the existing
  proving error UI — no new error surface added

### Test Plan

1. SDK `handleStatusCode` — `REGISTERED_COMMITMENT` downgrade
   (`packages/mobile-sdk-alpha/tests/proving/internal/statusHandlers.test.ts`)
   - flag off (default): returns `PROVE_ALREADY_REGISTERED`
   - flag on: returns `PROVE_FAILURE` with error_code and reason
     populated; machine terminates in `failure`
2. SDK `validatingDocument` emitter invariant
   (`packages/mobile-sdk-alpha/tests/proving/provingMachine.documentProcessor.test.ts`)
   - Mirrors the existing `routes to account recovery when nullifier
     is on chain` test with `forceRegisterOnAlreadyRegistered: true`
     passed to `init(...)` and set in state. Asserts the actor is
     **not** sent `ACCOUNT_RECOVERY_CHOICE` and is instead sent
     `VALIDATION_SUCCESS` (register path continues). A real
     `dscTree` is required so the fall-through DSC check does not
     throw.
3. App-to-SDK propagation glue
   (`app/tests/src/proving/buildProvingInitOptions.test.ts`, 4 cases)
   - dev + toggle on → `forceRegisterOnAlreadyRegistered: true`
   - dev + toggle off → `false`
   - non-dev + toggle on → `false`
   - dev + toggle undefined → `false`
   This test exists specifically to prevent SDK-side tests passing
   while the feature is never actually turned on from the app.
4. App `selfClientProvider` recovery listener
   (`app/tests/src/providers/selfClientProvider.test.tsx`)
   - Captures the listener map via a `__getLatestListenerMap` hook
     on the SDK mock, fires `PROVING_ACCOUNT_RECOVERY_REQUIRED`, and
     asserts:
     - toggle off → navigates to `AccountRecoveryChoice`
     - toggle on (in `IS_DEV_MODE`) → does not navigate
5. Debug shortcut
   (`app/tests/src/screens/dev/sections/DebugShortcutsSection.test.tsx`)
   - Renders the section with `IS_DEV_MODE=true`, presses the
     button by its `Register Circuit Test (scan)` label, asserts
     `navigate('CountryPicker')` was called and
     `'AccountRecoveryChoice'` was not.
6. Phase 1 regression
   (`app/tests/src/screens/account/recovery/*.test.tsx`)
   - recovery screens navigate to `AccountVerifiedSuccess`
     regardless of the harness toggle

### Validation

```bash
yarn workspace @selfxyz/mobile-sdk-alpha test
yarn workspace @selfxyz/mobile-sdk-alpha types
yarn workspace @selfxyz/mobile-app test
yarn workspace @selfxyz/mobile-app types
```

Manual local validation:

1. Enable the harness in dev settings.
2. Use a document that is already registered on-chain.
3. Tap the debug shortcut (or start scanning normally).
4. Complete scanning.
5. Confirm the register circuit runs locally (logs / timing).
6. Confirm the on-chain register tx is submitted and fails.
7. Disable the harness.
8. Confirm already-registered scanning routes to the normal
   recovery UI again.

### Definition Of Done

- [x] Debug shortcut enters `CountryPicker`, not recovery
- [x] `selfClientProvider` recovery navigation is gated on the
      harness toggle in dev mode
- [x] SDK exposes a default-off `forceRegisterOnAlreadyRegistered`
      flag on `ProvingInitOptions` that causes the proving machine
      to run register on already-registered documents
- [x] With the flag on, neither the `validatingDocument`
      `isNullifierOnchain` branch nor the TEE `REGISTERED_COMMITMENT`
      status can send the machine into `account_recovery_choice`
- [x] The app passes the flag into SDK proving init when and only
      when `IS_DEV_MODE` and `enableRecoveryCircuitTestFlow` are
      both true (covered by
      `buildProvingInitOptions.test.ts`)
- [x] Phase 1 harness branches in the recovery screens are removed;
      the unused `useRecoveryCircuitTestFlowEnabled` hook and its
      test are deleted
- [ ] With the harness on, the register circuit runs and the
      on-chain register tx fails as expected (manual validation)
- [x] With the harness off, recovery, registration, and proving
      behave exactly as before (covered by the Phase 1 regression
      tests)
- [x] SDK and app tests cover the new behavior and the Phase 1
      regression cases
