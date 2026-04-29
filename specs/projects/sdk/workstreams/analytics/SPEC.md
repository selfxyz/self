# Onboarding Analytics & Funnel — Implementation Spec

> Last updated: 2026-04-20
> Owner: Self Wallet / Product Analytics
> Project: [SDK Overview](../../OVERVIEW.md)
> Status: Active

## Scope Statement

This workstream owns the **analytics instrumentation of the Self Wallet onboarding flow** so that a Mixpanel funnel can measure registration completion rate and drop-off by stage with statistical confidence.

The workstream crosses the SDK/app boundary:

- SDK-side changes (`packages/mobile-sdk-alpha/`) provide the low-level primitives: a canonical event emission point inside the proving machine and a fix to the `AbstractButton` event-name mangling.
- App-side changes (`app/`) wire canonical step events into the onboarding state machine and fix "dead zone" screens that currently fire no decision event.

The Mixpanel dashboard itself is built after the event layer lands; it is not a code deliverable but is specified here so event design is driven by dashboard requirements.

## Why

The current onboarding instrumentation is sprawl: ~200 distinct event names across Segment (primary) and a Mixpanel native channel (NFC-only, justified — the only way to report from native modules). The sprawl produces four measurable problems:

1. **Dead zones.** `LogoConfirmationScreen`, `CountryPickerScreen`, `IDSelectionScreen`, and `ConfirmIdentificationScreen` fire no decision event, so drop-off at those choice points is invisible.
2. **Silent renaming.** `AbstractButton` prepends `Click: ` to every `trackEvent` prop it receives, so the constants in `PassportEvents` / `ProofEvents` do not match the event names that land in Mixpanel.
3. **Back-navigation pollution.** Screen-view events fire on every navigation state change; a user who goes back and forward re-fires the same step, inflating funnel re-entry counts.
4. **Event/property granularity mismatch.** Failure modes are split across many named events with no properties, so you cannot slice by `stage` or `reason`.

In combination, no accurate onboarding funnel can be built from the current event stream.

## Event Design Principles

This workstream adopts a **three-layer event model**:

- **Canonical onboarding layer** (Layer 1, ANA-01). A small set of `onboarding_*` and `funnel_step_*` terminal events, fire-once-per-onboarding-attempt, guarded by state rather than component lifecycle. These are the only events the main Mixpanel funnel and its alerts consume.
- **Canonical decision layer** (Layer 2, deferred to ANA-05). Per-occurrence events at decision points — currently `funnel_step_retried`, and eventually `Onboarding: Fallback Offered / Accepted / Declined`. Share `attempt_id` and the branch properties with Layer 1 for joining, but not part of the sequential funnel. Consumed by mini-funnels and friction analyses.
- **Diagnostic layer**. The existing ~200 events remain as debugging signal. They are **not** excluded from Mixpanel; they are excluded from the funnel.

**Invariants:**

- A canonical step event fires at most once per onboarding attempt, on a committed state transition — never on component mount, never on back-nav, never per-click.
- Every canonical event carries `attempt_id`, `initial_branch`, and `current_branch` (see Cross-branch flows below).
- **`Onboarding: Started` fires exactly once per attempt, emitted by the funnel helper's `ensureAttempt` bootstrap** when the first canonical step event arrives with no active attempt. Screens never call `startOnboardingAttempt` explicitly — the helper owns attempt lifecycle so entry-path proliferation (HomeNavBar "+", EmptyIdCard, ManageDocuments "Add new", KYC retry, recovery re-entry, etc.) can never cause zero or double STARTED events.
- The terminal `onboarding_completed` event fires iff the proving machine reaches `completed` state **via a true new-registration proof** (not the `ALREADY_REGISTERED` shortcut, not a `disclose` proof). Disclosure proofs get their own `disclosure_completed` event that is outside this funnel entirely.
- Screen-view (`Viewed X`) events are preserved as-is for Flows/Paths reports. They are not funnel steps.
- `duration_seconds` on `onboarding_completed` measures time from the first canonical step (typically `country_selected`) to completion, not from privacy-disclaimer dismiss. The disclaimer is a one-time legal gate, not part of registration effort.

## Cross-branch Flows

A user who starts in one branch can switch mid-flow. The canonical example: a user picks Passport (→ `biometric_passport`), camera/MRZ succeed, the NFC scan fails repeatedly, the app offers the KYC fallback, and the user accepts. The same user ends the attempt in `kyc`.

To avoid lying about these users in branch-filtered funnels, every canonical event carries two branch properties:

- **`initial_branch`** — the user's original intent, captured the first time a non-`pending` branch is supplied (normally at `document_type_selected`). **Immutable** for the rest of the attempt.
- **`current_branch`** — the currently active branch, updated by `setOnboardingBranch` when the user accepts a fallback. **Mutable**.

On the two terminal events (`onboarding_completed`, `onboarding_failed`) the helper also stamps **`used_fallback: boolean`**, computed as `initial_branch !== current_branch`, for dashboard convenience.

The caller-facing API still accepts a `branch` property on `trackOnboardingStep({ branch })` as input sugar; the helper translates that into an `initialBranch` lock + `currentBranch` update and emits `initial_branch`/`current_branch` on the wire. The input-side `branch` is never emitted verbatim.

### Dashboard queries this enables

| Question                                          | Filter                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| Users who _started_ biometric                     | `initial_branch = biometric_passport` (or `biometric_id`)        |
| Users who _completed_ via biometric               | `event = COMPLETED AND current_branch = biometric_passport`      |
| Users who fell back from biometric to KYC         | `initial_branch starts_with biometric_ AND current_branch = kyc` |
| Biometric starters' conversion regardless of path | `initial_branch starts_with biometric_ AND event = COMPLETED`    |
| Pure KYC users (never intended biometric)         | `initial_branch = kyc AND current_branch = kyc`                  |
| Cohort of users who used any fallback             | `event = COMPLETED AND used_fallback = true`                     |

### What this does NOT cover (deferred to ANA-05)

The current split tells you **what happened** — initial intent vs final outcome. It does **not** tell you **how the decision unfolded** at the fallback screen itself. To measure that, Layer 2 will add explicit events — `Onboarding: Fallback Offered / Accepted / Declined` — with `from_stage` and `reason` properties. Only with Layer 2 can the dashboard answer:

- When the fallback screen appears, what % accept, decline, or silently abandon?
- Which failure stage triggers fallback most (NFC vs MRZ vs parse error)?
- Does _offering_ fallback save or destroy biometric conversions overall?
- At which retry count do users typically switch branches?
- Fallback-offer → fallback-completion sub-funnel, with attrition per step

Layer 2 is filed as ANA-05 and should be the first follow-up after ANA-01 ships.

## Canonical Event Set

Every Layer 1 event carries `attempt_id`, `initial_branch`, and `current_branch` (see Cross-branch flows). Additional per-event properties below.

| Event                        | Fires when                                                                                         | Additional properties                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `onboarding_started`         | User dismisses the privacy disclaimer and enters the onboarding flow                               | — (both branches `pending` at this point)                |
| `country_selected`           | User confirms a country in `CountryPickerScreen`                                                   | `country_code`                                           |
| `document_type_selected`     | User confirms a document type in `IDSelectionScreen`                                               | `document_type`, `country_code` (locks `initial_branch`) |
| `document_scan_started`      | User opens camera (biometric branches), launches the KYC web SDK, or opens the Aadhaar file picker | —                                                        |
| `document_scan_succeeded`    | MRZ+NFC committed (biometric), KYC provider returns success, Aadhaar upload accepted               | `duration_seconds`, `attempt_count`                      |
| `proof_generation_started`   | Proving machine enters `proving` state                                                             | —                                                        |
| `proof_generation_succeeded` | Proving machine enters `completed` state with `circuitType === 'register'` (true new registration) | `duration_seconds`                                       |
| `onboarding_completed`       | Post-proof wrap-up done (terminal success state for the registration path)                         | `duration_seconds` (total onboarding), `used_fallback`   |

Supporting events (outside the main funnel but on the same event stream):

| Event                  | Purpose                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding_failed`    | Terminal failure. Carries `{stage, reason, recoverable, used_fallback}`. One event replaces 10+ named failure events for dashboard purposes — the detailed events still fire too. |
| `funnel_step_retried`  | User retried a step (e.g., NFC scan after a failure). Carries `{stage, reason, attempt_count}`. Distinct from drop-off signal.                                                    |
| `disclosure_completed` | Disclosure proof reached `completed` state. Outside the onboarding funnel. Kept for disclosure analytics.                                                                         |

## Branch Model

| `branch` value       | Flow                                                                                        | Canonical steps that apply                                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `biometric_passport` | Passport with chip; MRZ + NFC + proof                                                       | All 8 canonical steps                                                                                                                                                                                                                     |
| `biometric_id`       | eID card with chip; same mechanism as passport, different chip-scan animation and UX        | All 8 canonical steps                                                                                                                                                                                                                     |
| `kyc`                | Embedded KYC provider web SDK (Didit) — used for non-biometric docs and as NFC/MRZ fallback | 5 steps: `onboarding_started` → `country_selected` → `document_type_selected` → `document_scan_started` → `document_scan_succeeded` → proof steps → `onboarding_completed` (no NFC visibility; interior selfie/liveness steps are opaque) |
| `aadhaar`            | India-specific QR/PDF upload                                                                | Same 8 steps conceptually; `document_scan_*` maps to file pick + upload accept                                                                                                                                                            |

Biometric passport and biometric ID are treated as distinct branches (different chip animations, different UX) but are rolled up into a `biometric_combined` dashboard view.

## Mixpanel Dashboard Plan

Built after event layer lands. One Mixpanel board:

1. **Macro onboarding funnel** — `onboarding_started → document_scan_succeeded → proof_generation_succeeded → onboarding_completed`. Uniques mode. Conversion window 30 min. Filter: `is_internal != true` (when that property ships; see backlog ANA-02).
2. **Per-branch funnels** — four boards, each filtered on `branch`. Biometric branches get the full 8 steps; KYC gets 5; Aadhaar gets its variant.
3. **Biometric combined rollup** — `branch in (biometric_passport, biometric_id)`, otherwise identical to a per-branch funnel.
4. **Failure breakdown** — `onboarding_failed` event, grouped by `stage` + `reason`. Tells us where and why, not just that.
5. **Retry heat** — `funnel_step_retried` by stage and branch. Retry spikes are a UX signal distinct from drop-off.

## What This Doesn't Measure Yet

ANA-01 gets the app from "the funnel is unmeasurable" to "the funnel is measurable." It is _not_ the Revolut-grade end-state. The following gaps are known, scoped as followup issues, and worth surfacing up front so nobody mistakes ANA-01's scope for "the final funnel":

- **User-centric vs session-centric metrics** — `duration_seconds` measures within-session time. A user who starts Monday, abandons, finishes Wednesday is invisible in duration tracking. Needs: longer Mixpanel conversion windows, stable `distinct_id` across sessions, and clarity that "attempt" is an engineering convenience, not the analytical unit. Mixpanel's Uniques counting handles user-level dedup in the funnel itself, so this is mostly a dashboard-configuration concern once ANA-02 ships the build/user properties.
- **Segmentation fidelity** — only `country_code`, `document_type`, and the branch properties are attached today. A PM slicing drop-off wants device, OS, app_version, acquisition channel, experiment variant, build channel, time-of-day. Most of these belong as **super properties** set once per session. See ANA-02 (build + internal), ANA-06 (device/OS/version enrichment).
- **Step-view vs step-commit mini-funnels** — canonical events are commitment events. Users who view a screen but don't commit are invisible at the canonical layer; they show up only in the preserved `Viewed X` diagnostic events. See ANA-07.
- **Explicit abandonment modeling** — no event fires on app-background-with-incomplete-attempt. Silent drops look identical to "still thinking." See ANA-08.
- **Fallback decision visibility** — we know _that_ fallback happened via `used_fallback`, but not the decision path that led there (see Cross-branch flows, ANA-05).
- **A/B test tagging** — no `experiment_id` / `variant` on events. Blocks running experiments against the funnel. See ANA-09.
- **PM-roll-up metrics** — D1/D7/D30 completion, median time-to-verified, top-3 drop-off reasons are not pre-built. The raw events support them; the dashboard work is not yet specced. See ANA-10.
- **KYC provider interior** — selfie / liveness / doc-capture steps inside the provider web SDK are opaque. Requires provider-side instrumentation contract work.

The conversion window for the Mixpanel funnel should be set to a value matching the longest reasonable onboarding session (current recommendation: 30 min), not the default 7 days. This is a dashboard-side decision.

## Out of Scope (this workstream)

- TestFlight / internal-build contamination filtering (`build_channel`, `is_internal`). Deferred; see ANA-02.
- Cleanup of raw-string events (`REGISTRATION_FALLBACK_*`, `DEVICE_TOKEN_REG_*`) to typed constants. Deferred; see ANA-03.
- Consolidation of the Mixpanel NFC native channel vs Segment duplication. Deferred; see ANA-04. The dual firing is kept as-is because native-module events have no other path to reach the analytics backend.
- Fallback decision events (Layer 2). Deferred; see ANA-05.
- Super-property enrichment. Deferred; see ANA-06.
- Step-view mini-funnels. Deferred; see ANA-07.
- Abandonment events. Deferred; see ANA-08.
- A/B test tagging. Deferred; see ANA-09.
- PM dashboard roll-ups. Deferred; see ANA-10.
- Migration of the KYC provider's interior steps (selfie, liveness, doc capture) into the funnel. Provider web SDK is a black box at that level; requires provider-side instrumentation contract work.

## Execution Model

- Stable context for this workstream lives in this file.
- PR-sized execution lives under [`plans/`](./plans/).
- Canonical event contract decisions live here; implementation deviations must be reconciled by updating this file.

## Backlog

| ID     | Title                                                                    | Status   | Priority | Depends On             | Plan                                                                                         | Notes                                                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------ | -------- | -------- | ---------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ANA-01 | Canonical onboarding funnel events + dead-zone and AbstractButton fixes  | Done     | High     | -                      | [plans/ANA-01-canonical-onboarding-funnel.md](./plans/ANA-01-canonical-onboarding-funnel.md) | The full "do now" scope: canonical events, state-machine guards, terminal event invariant, dead-zone fixes, `Click:` prefix fix.                                                                                                                                                                                                                |
| ANA-02 | Filter TestFlight and internal-build traffic from onboarding funnel      | Deferred | Medium   | ANA-01                 | —                                                                                            | Add `build_channel` super property and `is_internal` user property with a debug-menu toggle. Optionally separate Mixpanel project per env.                                                                                                                                                                                                      |
| ANA-03 | Convert raw-string analytics events to typed constants across onboarding | Deferred | Low      | ANA-01                 | —                                                                                            | `REGISTRATION_FALLBACK_*`, `DEVICE_TOKEN_REG_*`, and similar get moved into the existing event-constant enums. Cosmetic for the funnel, prevents future drift.                                                                                                                                                                                  |
| ANA-04 | Consolidate Mixpanel NFC native channel with Segment (if feasible)       | Deferred | Low      | ANA-01                 | —                                                                                            | Investigate whether native NFC events can be routed through Segment. Expected outcome: not feasible for native-module origin, keep as-is with a doc comment.                                                                                                                                                                                    |
| ANA-05 | Fallback decision events and fallback-offer mini-funnel                  | Ready    | High     | ANA-01                 | —                                                                                            | Layer 2 canonical events: `Onboarding: Fallback Offered / Accepted / Declined` at the fallback screens (MRZ, NFC, LogoConfirmation "No"). Carries `from_stage` and `reason`. Enables fallback-offer → fallback-completion sub-funnel and answers "does offering fallback save or lose conversions." Should be the next work after ANA-01 ships. |
| ANA-06 | Super-property enrichment for segmentation                               | Deferred | High     | ANA-01                 | —                                                                                            | Attach device model, OS, OS version, app_version, acquisition_channel as super properties on every event. Blocks most Revolut-grade cohort analysis.                                                                                                                                                                                            |
| ANA-07 | Step-view canonical events for commit-vs-view mini-funnel                | Deferred | Medium   | ANA-01                 | —                                                                                            | Add `*_viewed` events to the canonical layer for each screen with a decision (country_picker_viewed, id_selection_viewed, etc.) so drop-off between view and commit is measurable.                                                                                                                                                              |
| ANA-08 | Explicit abandonment events on app background                            | Deferred | Medium   | ANA-01                 | —                                                                                            | Fire `Onboarding: Abandoned` with `{stage, reason}` when the app is backgrounded with an incomplete attempt, and/or when an attempt is overwritten by a new one. Turns silent drops into categorized ones.                                                                                                                                      |
| ANA-09 | A/B test tagging at the super-property layer                             | Deferred | High     | ANA-06                 | —                                                                                            | Attach `experiment_id` and `variant` from a config source as super properties. Required for running any onboarding experiment.                                                                                                                                                                                                                  |
| ANA-10 | PM-dashboard roll-ups (D1/D7/D30 conversion, TTV, top drop-off reasons)  | Deferred | Medium   | ANA-01, ANA-02, ANA-06 | —                                                                                            | Dashboard work, not instrumentation. Build the small set of "headline" metrics a PM watches weekly.                                                                                                                                                                                                                                             |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                         | IDs    | Status |
| -------------------------------------------------------------------------------------------- | ------ | ------ |
| [plans/ANA-01-canonical-onboarding-funnel.md](./plans/ANA-01-canonical-onboarding-funnel.md) | ANA-01 | Done   |

## References

- Mixpanel funnels: [funnels-advanced](https://docs.mixpanel.com/docs/reports/funnels/funnels-advanced) — Uniques vs Totals counting, conversion windows, Optimized Re-entry, specific vs any-order modes.
- Mixpanel identity: [identifying-users](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users) — ID merge requires an event _after_ `identify()` carrying both `$device_id` and `$user_id`.
- Mixpanel retention: [retention](https://docs.mixpanel.com/docs/reports/retention) — retention is for "came back days later," not multi-step completion. Use funnels for onboarding drop-off.
