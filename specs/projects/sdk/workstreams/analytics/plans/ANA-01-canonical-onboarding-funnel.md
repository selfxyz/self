# ANA-01: Canonical Onboarding Funnel Events

> Last updated: 2026-04-28 (shipped via PR #2000)
> Status: **Done**
> Priority: —
> Depends on: —

This is the historical record of what shipped in PR #2000. The current canonical-funnel contract (event set, properties, branch model, invariants) lives in [SPEC.md](../SPEC.md). Subsequent modifications: ANA-11 (bug fixes from production), with future modifications by ANA-12 / ANA-13.

## Why

The Mixpanel onboarding funnel was unmeasurable on three counts in the v0 codebase:

1. **Dead zones.** `LogoConfirmationScreen`, `CountryPickerScreen`, `IDSelectionScreen`, and `ConfirmIdentificationScreen` fired no event, so drop-off at those choice points was invisible.
2. **Silent renaming.** `AbstractButton` prepended `Click: ` to every `trackEvent` prop, so event names in Mixpanel did not match the typed constants in code.
3. **Back-navigation pollution.** Screen-view events fired on every navigation state change; back-nav re-fired step events and inflated re-entry counts.

This PR introduces a thin **canonical event layer** (~8 events) on top of the existing diagnostic events. The canonical layer is the only input to the Mixpanel onboarding funnel.

## Scope

### In scope

1. **SDK-side**:
   - Canonical-events module in `packages/mobile-sdk-alpha/src/constants/analytics.ts` (`OnboardingEvents` group).
   - Funnel helper in `packages/mobile-sdk-alpha/src/analytics/onboardingFunnel.ts` (`ensureAttempt`, `trackOnboardingStep`, `completeOnboardingAttempt`, `failOnboardingAttempt`, `setOnboardingBranch`, `resolveOnboardingBranch`).
   - Terminal-event emission inside `provingMachine.ts` `completed` state handler, gated on `circuitType === 'register' && didNewRegistrationProof`.
   - `AbstractButton` `trackEventRaw` prop.
2. **App-side**:
   - Wire canonical step events at committed transitions in country picker, ID selection, document camera, NFC scan, KYC launcher, Aadhaar upload.
   - Fix the four dead-zone screens to fire their canonical event on confirm.
3. **Tests**: unit tests for the fire-once guard; integration test for the proving-machine terminal invariant.

### Out of scope

- Internal-build / TestFlight contamination filtering — see ANA-02.
- Renaming or refactoring existing diagnostic events — see ANA-12 / ANA-13.
- Consolidating native NFC dual-firing — see ANA-04.
- Removing `__DEV__` analytics suppression.
- Building Mixpanel dashboards.
- KYC provider interior instrumentation — black box.

## Implementation

### Funnel helper (`onboardingFunnel.ts`)

In-memory attempt state at module level:

```ts
interface OnboardingAttempt {
  id: string; // uuid
  initialBranch: OnboardingBranch;
  currentBranch: OnboardingBranch;
  startedAt: number;
  firedSteps: Set<string>;
  retryCounts: Record<OnboardingStage, number>;
}
```

`ensureAttempt(selfClient)` creates a fresh attempt when none is active and emits `Onboarding: Started` as the bootstrap event. `trackOnboardingStep` calls `ensureAttempt` first, so screens never call `Onboarding: Started` directly — STARTED fires as a side effect of the first canonical step regardless of entry path.

`trackOnboardingStep` dedupes via `firedSteps`:

```ts
function trackOnboardingStep(selfClient, event, properties?) {
  const attempt = ensureAttempt(selfClient);
  if (properties?.branch) captureBranch(attempt, properties.branch);
  if (attempt.firedSteps.has(event)) return;
  attempt.firedSteps.add(event);
  selfClient.trackEvent(event, { ...baseProperties(attempt), ...properties });
}
```

`completeOnboardingAttempt` and `failOnboardingAttempt` clear the attempt on terminal so a subsequent registration starts fresh.

### Branch resolution

```ts
function resolveOnboardingBranch(documentType: string): OnboardingBranch {
  switch (documentType) {
    case 'p':
    case 'passport':
      return 'biometric_passport';
    case 'i':
    case 'id_card':
      return 'biometric_id';
    case 'a':
    case 'aadhaar':
      return 'aadhaar';
    case 'kyc':
      return 'kyc';
    default:
      return 'kyc';
  }
}
```

Lives in `onboardingFunnel.ts:187`. Called at `DOCUMENT_TYPE_SELECTED`; `captureBranch` then locks `initialBranch` (first non-pending value) and updates `currentBranch`.

### Terminal-event emission

`provingMachine.ts` subscribes to state transitions and fires canonical events from the `completed`, `failure`, and `error` states. The `completed` handler uses `didNewRegistrationProof` (set in `post_proving` only when `circuitType === 'register'`) to distinguish a real new registration from the `ALREADY_REGISTERED` shortcut:

```ts
if (
  state.value === 'completed' &&
  get().circuitType === 'register' &&
  get().didNewRegistrationProof
) {
  trackOnboardingStep(selfClient, OnboardingEvents.PROOF_SUCCEEDED);
  completeOnboardingAttempt(selfClient);
}
```

Disclosure flows reach `completed` with `circuitType === 'disclose'` and fall through to no canonical emit.

`PROOF_STARTED` fires when state enters `proving` (gate tightened to `circuitType === 'register'` by ANA-11).

### Canonical event fire sites

| Constant                                  | Fire site (v1)                                                                                                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OnboardingEvents.STARTED`                | `onboardingFunnel.ts:75` (helper bootstrap inside `ensureAttempt`)                                                                                                                                   |
| `OnboardingEvents.COUNTRY_SELECTED`       | `packages/mobile-sdk-alpha/src/flows/onboarding/country-picker-screen.tsx` `onCountrySelect`                                                                                                         |
| `OnboardingEvents.DOCUMENT_TYPE_SELECTED` | `packages/mobile-sdk-alpha/src/flows/onboarding/id-selection-screen.tsx` `onSelectDocumentType`                                                                                                      |
| `OnboardingEvents.SCAN_STARTED`           | `app/src/screens/documents/scanning/DocumentCameraScreen.tsx` (biometric); `LogoConfirmationScreen.tsx:77` (KYC fallback); `AadhaarUploadScreen.tsx` (Aadhaar). KYC pure-entry hook added by ANA-11. |
| `OnboardingEvents.SCAN_SUCCEEDED`         | `DocumentNFCScanScreen.tsx` (biometric); KYC provider success handler; `processAadhaarQRCode` success path.                                                                                          |
| `OnboardingEvents.PROOF_STARTED`          | `provingMachine.ts:488`                                                                                                                                                                              |
| `OnboardingEvents.PROOF_SUCCEEDED`        | `provingMachine.ts:533` (inside `completed` state, gated)                                                                                                                                            |
| `OnboardingEvents.COMPLETED`              | `completeOnboardingAttempt` in `onboardingFunnel.ts:133`                                                                                                                                             |
| `OnboardingEvents.FAILED`                 | `failOnboardingAttempt` invoked from `provingMachine.ts:559` and `:573` (failure / error states)                                                                                                     |
| `OnboardingEvents.STEP_RETRIED`           | `RegistrationFallbackMRZScreen.tsx` and `RegistrationFallbackNFCScreen.tsx` retry buttons                                                                                                            |

### Dead-zone fixes

| Screen                       | v0 behavior                     | v1 change                                                                                         |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `LogoConfirmationScreen.tsx` | No button tracking              | Fires diagnostic `App: Logo Confirmation Answered` with `{answer: 'yes' \| 'no'}`                 |
| `country-picker-screen.tsx`  | Emitted SDK-internal event only | Also calls `trackOnboardingStep(COUNTRY_SELECTED, { country_code })`                              |
| `id-selection-screen.tsx`    | Emitted SDK-internal event only | Also calls `trackOnboardingStep(DOCUMENT_TYPE_SELECTED, { document_type, country_code, branch })` |
| `ConfirmBelongingScreen.tsx` | Fired errors only               | Adds diagnostic `confirm_belonging_confirmed` event on success                                    |

### `AbstractButton` fix

File: `packages/mobile-sdk-alpha/src/components/buttons/AbstractButton.tsx`. Added a `trackEventRaw` prop. When set, the button emits the value verbatim (no `Click: ` prefix). The canonical-events wiring uses `trackEventRaw`. The legacy `trackEvent` prop kept its `Click: ` prefix for backwards compatibility with diagnostic-layer call sites.

## Validation

### Unit tests

- `packages/mobile-sdk-alpha/tests/analytics/onboardingFunnel.test.ts` — guard fires once, does not re-fire on second call, resets on terminal.
- `packages/mobile-sdk-alpha/tests/proving/provingMachine.*.test.ts` — terminal invariant holds across new-registration / `ALREADY_REGISTERED` / disclose paths.

### Commands

```bash
cd packages/mobile-sdk-alpha && yarn test && yarn types
cd app && yarn test && yarn types
yarn lint
```

### Manual verification

Against a dev Mixpanel project, complete one biometric-passport registration:

- Each canonical step event fires exactly once, in order.
- Events from step 3 onward carry `initial_branch=biometric_passport`.
- Back-navigating from `DocumentOnboardingScreen` to `CountryPickerScreen` and forward again does NOT re-emit `Onboarding: Country Selected`.
- An NFC scan failure followed by retry fires `Onboarding: Step Retried` once per retry; no extra canonical step events.
- A disclosure flow on the same device immediately after registration fires NO `Onboarding: *` events.

## Done Criteria

- ✅ All canonical events fire at the locations in the table.
- ✅ Guard prevents duplicate step events across back-nav.
- ✅ Terminal invariant holds.
- ✅ Unit tests pass.
- ✅ `yarn lint`, `yarn types` pass at repo root.
- ✅ Manual verification completed in dev Mixpanel project.

## Notes

- Dashboard build was the immediate next step after this landed. Built as "Canonical Onboarding Funnel — PR #2000" in Mixpanel project Self.
- `__DEV__` suppresses events locally. Manual verification required either a non-`__DEV__` staging build or a temporary local override.
- Production dashboard review on 2026-04-30 surfaced two bugs in this implementation; see ANA-11.
