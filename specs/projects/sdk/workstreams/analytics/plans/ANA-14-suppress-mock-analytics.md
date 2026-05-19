# ANA-14 — Suppress all analytics events from mock passport flow

> Linear: [SELF-2878](https://linear.app/selfprotocol/issue/SELF-2878/ana-14-suppress-all-analytics-events-from-mock-passport-flow)
> Workstream: [Onboarding Analytics & Funnel](../SPEC.md)
> Depends on: ANA-01 (canonical helper), ANA-11 (clean baseline). Forward-compatible with ANA-12 (branch helpers).
> PR target: <500 LOC.

## Context

The mock-passport developer flow (`CreateMockScreen` → `generateMockDocument` → `storePassportData` → `ConfirmBelonging` → proving machine) currently fires real Mixpanel events. Mock-creation screens themselves only emit `MockDataEvents.*` (a dev-only namespace), but once the mock document hits the proving machine, the analytics path is shared with the real flow with no guard.

Concrete impact:

- **`PassportEvents.PASSPORT_PARSED`** (`provingMachine.ts:1201`) sends `country_code` + `signature_algorithm` + DSC metadata for every QA passport. Once ANA-12 renames this to `BiometricEvents.DOCUMENT_PARSED` and dashboards key off `(country_code, signature_algorithm)` to surface unsupported docs, mock data becomes top contributor.
- **`OnboardingEvents.STARTED` bootstrap** fires at `PROOF_STARTED` for mock flows (which skip Country/DocType/Scan). Every QA proof inflates `Onboarding: Started` count, breaking conversion math.
- **`OnboardingEvents.PROOF_SUCCEEDED` + `OnboardingEvents.COMPLETED`** are deterministic for mocks, padding completion-rate numerators.
- **`ProofEvents.*`** (`PAYLOAD_GEN_STARTED`, `PAYLOAD_SENT`, `PROVING_PROCESS_STARTED`, `PROOF_COMPLETED`, plus diagnostic `DOCUMENT_LOAD_STARTED`, `USER_CONFIRMED`, `POST_PROVING_STARTED`, etc.) fire identically for mocks.

The proving stage already reads `passportData.mock` to choose env (`provingMachine.ts:1140`). The analytics layer ignores the same signal. **Decision: drop at source.** Tagging events with `is_mock: false` and dashboard-filtering was rejected — relies on every consumer remembering, silently re-pollutes the next dashboard built without the filter.

## Files modified

- `packages/mobile-sdk-alpha/src/analytics/onboardingFunnel.ts` — add mock-suppression to attempt state and emit functions.
- `packages/mobile-sdk-alpha/src/proving/provingMachine.ts` — stash `isMock` on the proving store, route all `selfClient.trackEvent` calls through a mock-aware local helper, mark the funnel attempt as mock immediately after document load.
- `packages/mobile-sdk-alpha/tests/proving/` — new test verifying mock no-emit invariant.
- `specs/projects/sdk/workstreams/analytics/SPEC.md` — backlog row + invariant.

## Implementation

### 1. Funnel helper changes — `packages/mobile-sdk-alpha/src/analytics/onboardingFunnel.ts`

You will:

- Add `isMock: boolean` to the `OnboardingAttempt` interface (default `false` on creation in `ensureAttempt`).
- Add a new exported function `markCurrentAttemptAsMock(selfClient: Pick<SelfClient, 'trackEvent'>): void`. Behavior:
  - If `currentAttempt` is null: bootstrap a fresh attempt with `isMock: true`, **without** firing `OnboardingEvents.STARTED`. Add `STARTED` to `firedSteps` anyway to keep the fire-once invariant.
  - If `currentAttempt` exists: set `currentAttempt.isMock = true` (idempotent).
- Gate every emit path on `attempt.isMock`:
  - `ensureAttempt` — when bootstrapping and `isMock === false`, emit `STARTED` as today. (When `markCurrentAttemptAsMock` created the attempt, `isMock === true`, so any later `ensureAttempt` call returns the existing attempt and never emits.)
  - `trackOnboardingStep` — after the dedup check, if `attempt.isMock`, return without calling `selfClient.trackEvent`. Still update `firedSteps`, `countryCode`, `documentType`, and call `captureBranch` so attempt state stays internally consistent for any code that later reads it.
  - `completeOnboardingAttempt` — if `currentAttempt.isMock`, clear the attempt and return without emitting `COMPLETED`.
  - `failOnboardingAttempt` — if `currentAttempt.isMock`, clear and return without emitting `FAILED`.
  - `trackOnboardingRetry` — if `attempt.isMock`, increment retry counter (state) but skip the emit.

Export order remains alphabetical (sort-exports). New export goes between `failOnboardingAttempt` and `resolveOnboardingBranch`.

### 2. Proving machine changes — `packages/mobile-sdk-alpha/src/proving/provingMachine.ts`

You will:

- Add `isMock: boolean` to the proving store state, initialized to `false`. Reset to `false` on `init`.
- Introduce a local helper `function trackEventIfNotMock(selfClient: SelfClient, get: () => ProvingStateMachine, eventName: string, properties?: Record<string, unknown>): void` defined at module scope below the existing helpers. Body: `if (get().isMock) return; selfClient.trackEvent(eventName, properties);`. Keep it private to the file.
- Find every `selfClient.trackEvent(...)` call in this file and replace with `trackEventIfNotMock(selfClient, get, ...)`. Inventory (verify by grepping after the edit):
  - `ProofEvents.PROOF_COMPLETED` — line 503
  - `ProofEvents.DOCUMENT_LOAD_STARTED` — line 1118
  - `PassportEvents.PASSPORT_DATA_NOT_FOUND` — line 1122
  - `ProofEvents.LOAD_SECRET_FAILED` — line 1134
  - `PassportEvents.PASSPORT_PARSED` — line 1201
  - `PassportEvents.PASSPORT_PARSE_FAILED` — line 1246
  - `PassportEvents.COMING_SOON` — line 1350
  - `ProofEvents.PAYLOAD_GEN_STARTED` — line 1642
  - `ProofEvents.PAYLOAD_SENT` — line 1652
  - `ProofEvents.PROVING_PROCESS_STARTED` — line 1653
  - `ProofEvents.USER_CONFIRMED` — line 1671
  - `ProofEvents.POST_PROVING_STARTED` — line 1680
  - `ProofEvents.POST_PROVING_CHAIN_STEP` — line 1683
  - Any `selfClient.trackEvent` not in this list — wrap it too. Run `grep -n "selfClient.trackEvent(" packages/mobile-sdk-alpha/src/proving/provingMachine.ts` after the edit; the only remaining bare calls should be inside the `trackEventIfNotMock` helper definition itself.
- Right after `set({ passportData, secret, env })` at `provingMachine.ts:1142`, add:
  ```ts
  const isMock = passportData.mock === true;
  set({ isMock });
  if (isMock) {
    markCurrentAttemptAsMock(selfClient);
  }
  ```
  This guarantees that:
  - `trackEventIfNotMock` short-circuits all subsequent diagnostic events for mock.
  - The funnel attempt is marked mock before the first canonical `trackOnboardingStep(PROOF_STARTED)` call (line 488) reaches `ensureAttempt`, so `Onboarding: Started` never fires.
- Import `markCurrentAttemptAsMock` alongside the existing `trackOnboardingStep` / `completeOnboardingAttempt` imports from `../analytics/onboardingFunnel`.

**Note on `selfClient.emit(SdkEvents.PROVING_BEGIN_GENERATION, ...)` at line 1636:** this is `emit`, not `trackEvent`. It is in-process event-bus signaling for SDK consumers, not Mixpanel. Leave it alone — its existing `isMock: passportData?.mock ?? false` payload is correct for downstream consumers that want the signal.

**Note on `selfClient.logProofEvent(...)` calls:** these route to Sentry breadcrumbs, not Mixpanel. Leave them alone — they're diagnostic context for crash reports.

### 3. Test — `packages/mobile-sdk-alpha/tests/proving/provingMachine.mockSuppression.test.ts`

You will create a new test file (Vitest, matches the existing `tests/proving/` style):

- Use `mockAdapters` and `genMockIdDoc({ idType: 'mock_passport' })` per the existing patterns in `tests/proving/provingMachine.documentProcessor.test.ts`.
- Spy on `selfClient.trackEvent`. Drive the proving machine through `init` → `processIDDocument` → `startProving` → `completed`.
- Assert: `trackEvent` was called **zero** times.
- Add a positive control test in the same file: same flow with `mock: false` passportData, assert `trackEvent` was called at least with `OnboardingEvents.STARTED` and `OnboardingEvents.PROOF_STARTED` (sanity check that the helper still works for real flows).
- Reset funnel state with `_resetOnboardingFunnelForTests()` in `beforeEach`.

### 4. Spec updates — `specs/projects/sdk/workstreams/analytics/SPEC.md`

You will:

- Add a new row to the Backlog table (between ANA-13 and ANA-05):
  ```
  | ANA-14 | Suppress all analytics events from mock passport flow | In Progress | High | ANA-01 | [plan](./plans/ANA-14-suppress-mock-analytics.md) |
  ```
- Append a new bullet to §Invariants:
  > - Mock-passport attempts (`passportData.mock === true`) emit no Mixpanel events from the proving machine or funnel helper. The dev-only `MockDataEvents.*` namespace is the sole telemetry surface for mock flows. The proving machine marks the active attempt as mock immediately after `loadSelectedDocument` and routes all `selfClient.trackEvent` calls through a mock-aware helper.

## Out of scope

- You will NOT add an `is_mock` super-property or per-event property. Drop at source, do not tag.
- You will NOT modify `MockDataEvents.*`, `CreateMockScreen.tsx`, or anything in the mock-creation flow — those are clean.
- You will NOT touch `selfClient.emit(SdkEvents.PROVING_BEGIN_GENERATION, ...)` or any `selfClient.logProofEvent(...)` calls — these are not Mixpanel.
- You will NOT change the proving stage's `'stg'` env routing logic at `provingMachine.ts:1140` — it is correct as-is.
- You will NOT add a "QA funnel" Mixpanel dashboard. If we want one later, build it on `MockDataEvents.*`.
- You will NOT backfill historical Mixpanel data to remove existing mock contamination.
- You will NOT introduce a new `BiometricEvents` namespace, rename `PassportEvents`, or pre-empt any ANA-12 work. ANA-14's gate is namespace-agnostic — it sits beneath whatever event names exist.
- You will NOT add UI or behavioral changes to the mock flow. Mock proofs continue to complete and store credentials as today.

## Validation

Run from the repo root:

```bash
cd packages/mobile-sdk-alpha && yarn test && yarn types
```

Both must pass. The new `provingMachine.mockSuppression.test.ts` must be in the run.

Manual smoke test (recommended, not blocking):

1. Build the app for simulator: `cd app && yarn ios` (or Android equivalent).
2. Enable Mixpanel debug logging in the analytics adapter (or attach a `trackEvent` breakpoint in `selfClient`).
3. Run the full mock flow: open app → Create Mock Document → confirm → wait for proof completion.
4. Confirm no `Onboarding:`, `Biometric:`, `Passport:`, or `Proof:` events fire. `MockData:*` events from the creation screens should fire as today.
5. Repeat with a real passport (TestFlight or staging build) and confirm the canonical funnel still fires end-to-end.

## Acceptance criteria

- Running the full mock flow produces zero `selfClient.trackEvent` calls — verified by the new unit test.
- A non-mock passportData run still emits `Onboarding: Started` → `Onboarding: Proof Generation Started` → `Onboarding: Proof Generation Succeeded` → `Onboarding: Completed` plus the existing diagnostic stream — verified by the positive-control test and existing tests in `tests/proving/`.
- `MockDataEvents.*` emissions from `CreateMockScreen.tsx` are unchanged.
- `yarn test` and `yarn types` in `packages/mobile-sdk-alpha` pass.
- `SPEC.md` updated with the ANA-14 backlog row and invariant bullet.
- One PR, <500 LOC including the test file.
