# Onboarding Analytics & Funnel — Implementation Spec

> Last updated: 2026-05-07
> Owner: Self app / Product Analytics
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## Why

We need a Mixpanel onboarding funnel we can **trust** before we extend it. Trust means: every event has a named consumer, the numbers reflect reality (not implementation accidents), and disclosure / mock / dev traffic doesn't pollute prod metrics.

The work splits into four phases, in priority order:

1. **Make the funnel measurable** — canonical events at committed transitions, fire-once guard, terminal invariant. (ANA-01.)
2. **Make the numbers correct** — fix bugs found post-deployment that produced misleading dashboards. (ANA-11.)
3. **Make per-branch drop-off visible** — branch-specific milestone events and dashboards for biometric / KYC / Aadhaar. (ANA-12.)
4. **Separate funnel signal from operational noise** — move ~80% of current Mixpanel events to Sentry breadcrumbs and Session Replay, with cohort tags for filtering. (ANA-13.)

Smaller follow-ups (cohort filtering, fallback decision events, abandonment) come after.

## Scope

The workstream crosses the SDK/app boundary:

- SDK-side (`packages/mobile-sdk-alpha/`) owns the canonical funnel helper, branch event helper, and proving-machine emission points.
- App-side (`app/`) wires canonical and branch events into screens and hooks, manages Sentry session context, and configures Session Replay masking.

### Out of scope (workstream-wide)

- WebView observability — WebView (`packages/webview-app/`) has no Sentry integration in this workstream's scope. Observability for the WebView is owned by `webview-in-app/` (see [Observability](../webview-in-app/SPEC-OBSERVABILITY.html)), which extends the ANA-13 surface into the WebView using the same cohort tag taxonomy, redact list, and terminal-event clear semantics.
- Native NFC analytics channel cleanup — see ANA-04 investigation.
- KYC provider interior steps (selfie / liveness / doc capture) — black-box; requires provider contract work.
- Mixpanel ID-merge / cross-session funnel windows — dashboard configuration, not instrumentation.

## Event Design Principles

Four observability layers, three in Mixpanel, one in Sentry:

- **Canonical onboarding funnel** (`OnboardingEvents.*`, ANA-01) — branch-agnostic, fire-once-per-attempt, drives the macro funnel.
- **Branch-specific milestones** (`BiometricEvents.*` / `KycEvents.*` / `AadhaarEvents.*`, ANA-12) — per-branch drilldown, joined to canonical via `attempt_id`.
- **Decision events** (`Onboarding: Fallback Offered/Accepted/Declined`, ANA-05) — per-occurrence at decision points; not part of the sequential funnel.
- **Forensic context** (Sentry breadcrumbs + tags + Session Replay, ANA-13) — diagnostic plumbing that used to live in Mixpanel.

### Invariants

- A canonical step event fires at most once per onboarding attempt, on a committed state transition. Never on component mount, never on back-nav, never per-click.
- Every canonical and branch event carries `attempt_id`, `initial_branch`, `current_branch`. Branch events do NOT bootstrap an attempt — they no-op if no attempt is active.
- `Onboarding: Started` fires exactly once per attempt, emitted by the funnel helper's `ensureAttempt` bootstrap when the first canonical step event arrives. Screens never call it directly.
- An onboarding attempt has three terminal outcomes, mutually exclusive: `Onboarding: Completed` (new-registration proof succeeded — `circuitType === 'register' && didNewRegistrationProof`), `Onboarding: Recovered` (already-registered shortcut, user got their account back — `circuitType === 'register' && !didNewRegistrationProof`), `Onboarding: Failed` (any non-disclose failure). Exactly one fires per attempt; the attempt is cleared on emission. Disclosure flows fire **no** `Onboarding: *` event.
- New Mixpanel events require a documented consumer (dashboard, alert, or product question) in the PR description. After ANA-13 phase 3, the cap is enforced at the type system.
- Mock-passport attempts (`passportData.mock === true`) emit no Mixpanel events from the proving machine or funnel helper (ANA-14). The dev-only `MockDataEvents.*` namespace is the sole telemetry surface for mock flows. The proving machine marks the active attempt as mock immediately after `loadSelectedDocument` and routes all `selfClient.trackEvent` calls through a mock-aware helper.

## Canonical Event Set

Every event carries `attempt_id`, `initial_branch`, `current_branch` plus the additional properties below. Implementation details (file paths, fire-site line numbers, helper code) live in the plan that introduced or modified the event — see ANA-01 for v1, ANA-11 for the post-deployment bug fixes.

| Event                                    | Fires when                                                                                       | Additional properties                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `Onboarding: Started`                    | Helper-bootstrapped when the first canonical step event reaches an attempt-less state            | — (branches `pending`)                      |
| `Onboarding: Country Selected`           | User confirms a country                                                                          | `country_code`                              |
| `Onboarding: Document Type Selected`     | User confirms a document type. Locks `initial_branch`.                                           | `document_type`, `country_code`             |
| `Onboarding: Document Scan Started`      | Camera open (biometric), KYC modal launch, or Aadhaar QR picker open                             | —                                           |
| `Onboarding: Document Scan Succeeded`    | MRZ+NFC committed, provider returns success, or upload accepted                                  | `duration_seconds`                          |
| `Onboarding: Proof Generation Started`   | Proving machine enters `proving` with `circuitType === 'register'`                               | —                                           |
| `Onboarding: Proof Generation Succeeded` | Proving machine reaches `completed` with `circuitType === 'register' && didNewRegistrationProof` | `duration_seconds`                          |
| `Onboarding: Completed`                  | Same gate as PROOF_SUCCEEDED, post-proof wrap-up done                                            | `duration_seconds` (total), `used_fallback` |
| `Onboarding: Recovered`                  | Proving machine reaches `completed` via `ALREADY_REGISTERED` shortcut (user re-scanned a doc already on-chain — account recovery, not new registration). Mutually exclusive with `Completed`. | `duration_seconds` (total), `used_fallback`, `country_code`, `document_type` |

Supporting events on the same stream:

| Event                      | Purpose                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Onboarding: Failed`       | Terminal failure for any non-disclose `circuitType`. Properties: `stage`, `reason`, `recoverable`, `duration_seconds`, `used_fallback`, `proof_type` (`'register' \| 'dsc'`, present on proving-stage failures). |
| `Onboarding: Step Retried` | User retried a step. Properties: `stage`, `reason`, `attempt_count`.                                                                                                                                             |

Disclosure flows fire **no** `Onboarding: *` event. Diagnostic completion is captured by `ProofEvents.PROOF_COMPLETED` with `circuitType: 'disclose'`.

## Branch Model

| `branch` value       | Flow                                                           | Scanning mechanic                                     |
| -------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| `biometric_passport` | Passport with chip                                             | MRZ + NFC + DSC validation                            |
| `biometric_id`       | eID card with chip; same code path as passport                 | MRZ + NFC + DSC validation                            |
| `kyc`                | Embedded KYC provider web SDK; non-biometric docs and fallback | Provider modal (interior is a black box)              |
| `aadhaar`            | India-specific QR upload                                       | Photo library → QR parse → timestamp validate → store |

Biometric passport and biometric ID are distinct branches but roll up into a `biometric_combined` dashboard view.

## Cross-branch Flows

A user who starts in one branch can switch mid-flow. Canonical example: pick Passport, MRZ succeeds, NFC fails, accept KYC fallback. The user ends the attempt in `kyc`. Two branch properties on every canonical event:

- **`initial_branch`** — original intent, locked at first non-`pending` value (normally at `document_type_selected`). Immutable for the attempt.
- **`current_branch`** — currently active branch, updated by `setOnboardingBranch` on fallback. Mutable.

On terminal events the helper additionally stamps `used_fallback: initial_branch !== current_branch`.

### Dashboard queries this enables

| Question                                  | Filter                                                           |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Users who _started_ biometric             | `initial_branch in (biometric_passport, biometric_id)`           |
| Users who _completed_ via KYC             | `event = COMPLETED AND current_branch = kyc`                     |
| Users who fell back biometric → KYC       | `initial_branch starts_with biometric_ AND current_branch = kyc` |
| Pure KYC users (never intended biometric) | `initial_branch = kyc AND current_branch = kyc`                  |
| Cohort that used any fallback             | `event = COMPLETED AND used_fallback = true`                     |

### Fallback decision visibility — gap

The branch split tells you _what happened_ (initial intent vs final outcome) but not _how the decision unfolded_ at the fallback screen. ANA-05 will add `Onboarding: Fallback Offered/Accepted/Declined` to answer this.

## Execution Model

- This file is the durable workstream context. It owns the contract (event set, branch model, cross-branch flows, invariants).
- PR-sized execution lives under [`plans/`](./plans/). Each plan describes one PR.
- **Plan files are frozen on merge.** When a later plan modifies the contract (e.g., ANA-11 changed `PROOF_STARTED`'s gate), it updates this file and documents its delta in its own plan. The original plan is not edited after merge.

## Backlog

| ID     | Title                                                                       | Status      | Priority | Depends on             | Plan                                                            |
| ------ | --------------------------------------------------------------------------- | ----------- | -------- | ---------------------- | --------------------------------------------------------------- |
| ANA-01 | Canonical onboarding funnel events + dead-zone fixes                        | **Done**    | —        | —                      | [plan](./plans/ANA-01-canonical-onboarding-funnel.md)           |
| ANA-11 | Canonical funnel bug fixes (post-ANA-01 production findings)                | In Review   | High     | ANA-01                 | [plan](./plans/ANA-11-canonical-funnel-bug-fixes.md) — PR #2048 |
| ANA-12 | Branch-specific funnel events (Biometric / KYC / Aadhaar)                   | Ready       | High     | ANA-01, ANA-11         | [plan](./plans/ANA-12-branch-specific-funnel-events.md)         |
| ANA-13 | Observability migration — Mixpanel diet, Sentry breadcrumbs, Session Replay | Ready       | High     | ANA-01, ANA-11, ANA-12 | [plan](./plans/ANA-13-observability-migration.md)               |
| ANA-14 | Suppress all analytics events from mock passport flow                       | In Progress | High     | ANA-01                 | [plan](./plans/ANA-14-suppress-mock-analytics.md)               |
| ANA-15 | Per-attempt support reference (attempt_id footer) on onboarding error screens | Ready       | Medium   | ANA-01, ANA-13         | [plan](./plans/ANA-15-attempt-id-on-error-screens.md)           |
| ANA-05 | Fallback decision events and fallback-offer mini-funnel                     | Ready       | Medium   | ANA-01, ANA-12         | —                                                               |
| ANA-08 | Explicit abandonment events on app background                               | Ready       | Low      | ANA-01                 | —                                                               |
| ANA-02 | Investigation: internal/TestFlight traffic filtering                        | Ready       | Medium   | —                      | —                                                               |
| ANA-04 | Investigation: native NFC analytics channel                                 | Ready       | Low      | ANA-13                 | —                                                               |

Allowed statuses: `Ready`, `In Progress`, `In Review`, `Blocked`, `Done`.

**Investigation items** (ANA-02, ANA-04) are loose-scope: they produce a doc + recommendation, possibly followed by a small implementation spec. Not PR-shaped on creation.

## Future Concerns (not tracked specs)

- **A/B test tagging.** When experiments are introduced, attach `experiment_id` and `variant` as super properties. Trigger: first onboarding experiment scheduled.
- **Acquisition channel attribution.** One super-property addition (`acquisition_channel`); bolt onto whichever spec touches the analytics service next.
- **KYC provider interior instrumentation.** Selfie / liveness / doc capture inside the KYC provider are opaque. Trigger: provider-side conversation opens.
- **Cross-session attempt continuity.** Today an "attempt" is in-memory module state. Mixpanel Uniques counting handles user-level dedup at the funnel layer; revisit the model only if PMs need true user-level metrics.

## Cancelled / Superseded

IDs are not reused.

| ID     | Title                                                  | Reason                                                                                                                                                       |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ANA-03 | Convert raw-string analytics events to typed constants | Superseded by ANA-12 (curates event sets, renames `PassportEvents → BiometricEvents`, creates `KycEvents`, curates `AadhaarEvents`).                         |
| ANA-06 | Super-property enrichment for segmentation             | Cancelled. Mixpanel auto-captures device, OS, OS version, app_version. Missing piece (`acquisition_channel`) is one line — see Future Concerns.              |
| ANA-07 | Step-view canonical events                             | Cancelled. With ANA-13, "user saw this screen" is a Sentry breadcrumb (free, attached to errors and replays). View → commit dashboard metric is speculative. |
| ANA-09 | A/B test tagging at the super-property layer           | Moved to Future Concerns. No spec until experiments are scheduled.                                                                                           |
| ANA-10 | PM-dashboard roll-ups                                  | Cancelled. Dashboard work, not instrumentation. Build dashboards on demand.                                                                                  |

## References

- Mixpanel funnels: [funnels-advanced](https://docs.mixpanel.com/docs/reports/funnels/funnels-advanced) — Uniques vs Totals, conversion windows, breakdown propagation behavior (relevant to ANA-11 §"Non-bug clarification").
- Mixpanel identity: [identifying-users](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users) — ID merge requires an event after `identify()` carrying both `$device_id` and `$user_id`.
- Sentry React Native: `@sentry/react-native@7.0.0` — breadcrumb + tag pipeline already wired via `selfClient.logProofEvent` → `app/src/config/sentry.ts:296`.
