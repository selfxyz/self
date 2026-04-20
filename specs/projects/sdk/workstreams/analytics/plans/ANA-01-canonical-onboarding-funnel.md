# ANA-01: Canonical Onboarding Funnel Events

> Last updated: 2026-04-20
> Status: Ready
> Priority: High
> Depends on: -

- Workstream: analytics
- Backlog ID: ANA-01
- Linear: TBD (draft pending)
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The Mixpanel onboarding funnel is currently not measurable with confidence because of three upstream defects in the code:

1. Several decision screens fire no event (`LogoConfirmationScreen`, `CountryPickerScreen`, `IDSelectionScreen`, `ConfirmIdentificationScreen`), so drop-off at those points is invisible.
2. The `AbstractButton` helper silently prepends `Click: ` to every `trackEvent` prop it receives, so the event names in the Mixpanel dashboard do not match the typed constants in code.
3. Screen-view events fire on every navigation state change; back-nav re-fires step events and inflates re-entry counts.

You are adding a thin **canonical event layer** (~8 new events) on top of the existing ~200 diagnostic events. The canonical layer is the only input to the Mixpanel funnel. The diagnostic layer stays untouched.

## Scope

### In scope

1. **SDK-side:**
   - Add a canonical-events module to `packages/mobile-sdk-alpha/` that defines the event names and property schemas as typed constants.
   - Add a canonical terminal-event emission inside the proving machine's `completed` state handler (`packages/mobile-sdk-alpha/src/proving/provingMachine.ts:461-490`), gated on `circuitType === 'register'` AND "this session started as a registration" (see Terminal Event Invariant below).
   - Fix `AbstractButton` to stop prepending `Click: ` when the `trackEvent` prop is a canonical event name. The `Click:` prefix stays for the existing diagnostic case to avoid a coordinated rename.
2. **App-side:**
   - Wire canonical step events at the committed transitions listed in the event table below, inside the onboarding state machine / navigation handlers — not inside `useEffect`s on mount.
   - Add a guard (a `Set<string>` in the onboarding store) so each canonical step fires at most once per onboarding attempt. Going back and forward must not re-fire the event. The guard resets on `onboarding_started` and on `onboarding_failed`/`onboarding_completed` terminal events.
   - Fix the four dead-zone screens to fire their canonical event on confirm.
3. **Tests:**
   - Unit tests for the guard (fire once, don't re-fire on back-nav, reset on terminal).
   - Integration test for the proving-machine terminal invariant (fires on new registration, does not fire on `ALREADY_REGISTERED`, does not fire on `disclose`).

### Out of scope

- You will NOT add `build_channel` or `is_internal` properties. That is ANA-02.
- You will NOT rename or refactor existing diagnostic events (`REGISTRATION_FALLBACK_*`, `DEVICE_TOKEN_REG_*`, etc). That is ANA-03.
- You will NOT consolidate the NFC dual-firing (`trackEvent` + `trackNfcEvent`). That is ANA-04.
- You will NOT remove `__DEV__` analytics suppression. Keep the existing behavior.
- You will NOT build the Mixpanel dashboard as part of this PR. Dashboard work happens after the events are live and validated in a staging Mixpanel project.
- You will NOT add instrumentation inside the KYC provider web SDK. The provider is a black box; the `kyc` branch funnel covers only the entry and exit.

## Canonical Events — Implementation Table

Add these as typed constants in a new file: `packages/mobile-sdk-alpha/src/analytics/canonicalEvents.ts`.

| Constant                             | Event name                     | Fire location                                                                                                                                                  | Properties                                                                                     |
| ------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `OnboardingEvents.STARTED`           | `onboarding_started`           | `app/src/screens/onboarding/DisclaimerScreen.tsx` — on `DISMISS_PRIVACY_DISCLAIMER` button press, before navigation                                            | `branch: 'pending'`                                                                            |
| `OnboardingEvents.COUNTRY_SELECTED`  | `country_selected`             | `packages/mobile-sdk-alpha/src/flows/onboarding/country-picker-screen.tsx` — inside `onCountrySelect` (line ~37), after country is committed to the store       | `branch: 'pending'`, `country_code`                                                            |
| `OnboardingEvents.DOCUMENT_TYPE_SELECTED` | `document_type_selected`   | `packages/mobile-sdk-alpha/src/flows/onboarding/id-selection-screen.tsx` — inside `onSelectDocumentType` (line ~142), after doc type committed                  | `branch` (now resolvable from doc type: biometric_passport/biometric_id/aadhaar/kyc), `document_type`, `country_code` |
| `OnboardingEvents.SCAN_STARTED`      | `document_scan_started`        | Biometric: `app/src/screens/documents/scanning/DocumentCameraScreen.tsx` on camera open. KYC: provider launch screen. Aadhaar: file-picker open in `AadhaarUploadScreen.tsx`. | `branch`                                                                                       |
| `OnboardingEvents.SCAN_SUCCEEDED`    | `document_scan_succeeded`      | Biometric: `DocumentNFCScanScreen.tsx` line 377 (success path). KYC: on provider result `success`. Aadhaar: on upload accept.                                   | `branch`, `duration_seconds`, `attempt_count`                                                  |
| `OnboardingEvents.PROOF_STARTED`     | `proof_generation_started`     | `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` — when state enters `proving` (near the existing `PROVING_PROCESS_STARTED` event)                    | `branch`                                                                                       |
| `OnboardingEvents.PROOF_SUCCEEDED`   | `proof_generation_succeeded`   | `packages/mobile-sdk-alpha/src/proving/provingMachine.ts:461-490` — inside `completed` state, gated on terminal invariant (below)                              | `branch`, `duration_seconds`                                                                   |
| `OnboardingEvents.COMPLETED`         | `onboarding_completed`         | After `proof_generation_succeeded` fires, on the post-proving terminal success transition (near the existing `_handleAccountVerifiedSuccess` call, line 479)    | `branch`, `duration_seconds` (total onboarding, measured from `onboarding_started`)            |
| `OnboardingEvents.FAILED`            | `onboarding_failed`            | Any terminal failure: `provingMachine.ts:504` (`failure` state), `provingMachine.ts:516` (`error` state), KYC provider failure, Aadhaar upload failure           | `branch`, `stage` (which canonical step failed), `reason`, `recoverable: boolean`              |
| `OnboardingEvents.STEP_RETRIED`      | `funnel_step_retried`          | Fallback screens (`RegistrationFallbackMRZScreen.tsx`, `RegistrationFallbackNFCScreen.tsx`) when user taps "Retry"; Aadhaar retry screen                         | `branch`, `stage`, `reason`                                                                    |
| `OnboardingEvents.DISCLOSURE_COMPLETED` | `disclosure_completed`      | `provingMachine.ts:461-490` — inside `completed` state, when `circuitType === 'disclose'`                                                                      | none required                                                                                   |

## Terminal Event Invariant

`onboarding_completed` and `proof_generation_succeeded` must fire **only** when a new registration proof actually succeeded in this session — not when the proving machine discovered the document was already registered, and not on any `disclose` flow.

Currently, `provingMachine.ts:1332` sets `circuitType = 'register'` as a side-effect when `ALREADY_REGISTERED` is triggered from a disclose flow. This is convenient for downstream code but makes a simple `circuitType === 'register'` check ambiguous at the terminal.

You will add a boolean in the proving store: `enteredAsRegistration`, set at `init()` to `circuitType === 'register'` (the type the session was started with, captured before any mid-flow flipping). The terminal gate is:

```ts
if (state.value === 'completed'
    && get().circuitType === 'register'
    && get().enteredAsRegistration === true) {
  selfClient.trackEvent(OnboardingEvents.PROOF_SUCCEEDED, { branch, duration_seconds });
  // later, after _handleAccountVerifiedSuccess:
  selfClient.trackEvent(OnboardingEvents.COMPLETED, { branch, duration_seconds });
}
```

Disclosure completion:

```ts
if (state.value === 'completed' && get().circuitType === 'disclose') {
  selfClient.trackEvent(OnboardingEvents.DISCLOSURE_COMPLETED);
}
```

The existing `PROOF_COMPLETED` event (line 462) stays as-is for diagnostic continuity.

## Fire-Once Guard

Add to the onboarding store (wherever onboarding session state lives in the app):

```ts
interface OnboardingAnalyticsState {
  firedSteps: Set<string>;
  attemptId: string; // uuid, reset on onboarding_started
  startedAt: number; // Date.now() when onboarding_started fired
}
```

Helper:

```ts
function trackStepOnce(step: OnboardingStepName, properties: Record<string, unknown>) {
  if (state.firedSteps.has(step)) return;
  state.firedSteps.add(step);
  selfClient.trackEvent(step, { ...properties, attempt_id: state.attemptId });
}
```

Reset conditions:

- On `onboarding_started`: generate new `attemptId`, clear `firedSteps`, record `startedAt`.
- On `onboarding_completed` or `onboarding_failed`: clear `firedSteps`. The `attemptId` persists on the completed event for post-hoc correlation.

Back-navigation must not re-fire: a user going from doc-type-selected back to country-picker and forward again must not re-emit `country_selected`. The guard handles this without requiring screen-view changes.

## Dead-Zone Fixes

| Screen                                                                                            | Current behavior                                          | Change                                                                                                           |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `app/src/screens/documents/selection/LogoConfirmationScreen.tsx`                                  | No button tracking                                        | Fire a diagnostic `logo_confirmation_answered` event with `{answer: 'yes' | 'no'}` on each button. This is not a canonical step — it's diagnostic context.  |
| `packages/mobile-sdk-alpha/src/flows/onboarding/country-picker-screen.tsx` (line ~37)             | Emits SDK internal event only                             | Also call `trackStepOnce(OnboardingEvents.COUNTRY_SELECTED, { country_code })`                                    |
| `packages/mobile-sdk-alpha/src/flows/onboarding/id-selection-screen.tsx` (line ~142)              | Emits SDK internal event only                             | Also call `trackStepOnce(OnboardingEvents.DOCUMENT_TYPE_SELECTED, { document_type, country_code, branch })` — `branch` is resolved here for the first time |
| `app/src/screens/documents/selection/ConfirmBelongingScreen.tsx` (wraps `ConfirmIdentificationScreen`) | Fires errors only                                        | Add a diagnostic `confirm_belonging_confirmed` event on success path                                             |

## AbstractButton Fix

File: `packages/mobile-sdk-alpha/src/components/buttons/AbstractButton.tsx` (line 82-94).

Current behavior:
```ts
if (trackEvent) {
  const parsedEvent = trackEvent?.split(':')?.[1]?.trim();
  if (parsedEvent) {
    trackEvent = parsedEvent;
  }
  selfClient.trackEvent(`Click: ${trackEvent}`);
}
```

Change: add a `trackEventRaw` prop. When set, the button emits `trackEventRaw` verbatim (no prefix). When only `trackEvent` is set, keep the existing `Click: ` prefix behavior for backwards compatibility with the diagnostic layer. The canonical-events wiring uses `trackEventRaw`.

Rationale: coordinated-renaming every existing `trackEvent` consumer is out of scope (see ANA-03). The `trackEventRaw` opt-in is a small additive change that unblocks the canonical layer now.

## Branch Resolution

`branch` is `'pending'` for events fired before `document_type_selected`. From that event onward, resolve as follows:

```ts
function resolveBranch(documentType: DocumentType): Branch {
  if (documentType === 'aadhaar') return 'aadhaar';
  if (isNonBiometric(documentType)) return 'kyc';
  if (documentType === 'passport') return 'biometric_passport';
  if (documentType === 'id_card') return 'biometric_id';
  return 'kyc'; // default fallback when a new doc type is added
}
```

Store `branch` in the onboarding analytics state once resolved so downstream events can stamp it without recomputing.

## Validation

### Unit tests

- `packages/mobile-sdk-alpha/src/analytics/__tests__/canonicalEvents.test.ts` — event name constants are stable strings matching the table above.
- `app/src/stores/__tests__/onboardingAnalytics.test.ts` — guard fires once, does not re-fire on second call, resets on `onboarding_started`.
- `packages/mobile-sdk-alpha/src/proving/__tests__/provingMachine.analytics.test.ts` — terminal invariant: fires on new registration, does not fire on `ALREADY_REGISTERED`, does not fire on `disclose`.

### Commands

```bash
cd packages/mobile-sdk-alpha && yarn test && yarn types
cd app && yarn test
yarn lint && yarn types
```

### Manual verification (single run)

Run the mobile app against a **dev Mixpanel project** (not prod). Complete one full registration on biometric passport branch. Verify in the dev Mixpanel project:

- Exactly one `onboarding_started`, one `country_selected`, one `document_type_selected`, one `document_scan_started`, one `document_scan_succeeded`, one `proof_generation_started`, one `proof_generation_succeeded`, one `onboarding_completed`.
- Every event carries `branch: 'biometric_passport'` (except the first two, which carry `branch: 'pending'` — acceptable).
- Navigate back from `DocumentOnboardingScreen` to `CountryPickerScreen` and forward again. Verify `country_selected` is **not** re-emitted.
- Trigger an NFC scan failure and retry. Verify `funnel_step_retried` fires once per retry, and no extra canonical step events fire.
- Run a disclosure flow on the same device immediately after registration. Verify `onboarding_completed` does **not** fire for the disclosure; `disclosure_completed` does.

## Done Criteria

- All canonical events fire at the locations in the table.
- Guard prevents duplicate step events across back-nav.
- Terminal invariant holds across all three cases (new registration, already-registered, disclose).
- Unit tests pass.
- `yarn lint`, `yarn types` pass at repo root.
- Manual verification checklist above completes in a dev Mixpanel project.
- This plan's **Linear issue** is updated via a comment (not description edit) summarizing what shipped and linking the PR.

## Notes

- The dashboard build is the immediate next step after this lands, but is not in this PR. Keep the dev Mixpanel project events for one release cycle to validate numbers against the old ones before the new funnel becomes authoritative.
- `__DEV__` still suppresses events locally. That means this plan's manual verification requires either a non-`__DEV__` staging build or a temporary local override — document whichever path is used in the PR description.
