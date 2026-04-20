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

This workstream adopts a **two-layer event model**:

- **Canonical layer.** A small set of `funnel_step_*` and terminal events, fire-once-per-onboarding-attempt, guarded by the onboarding state machine rather than component lifecycle. These are the only events the Mixpanel funnel and its alerts consume.
- **Diagnostic layer.** The existing ~200 events remain as diagnostic signal for debugging individual flows. They are **not** excluded from Mixpanel; they are excluded from the funnel.

**Invariants:**

- A canonical step event fires at most once per onboarding attempt, on a committed state transition — never on component mount, never on back-nav, never per-click.
- Every canonical event carries a `branch` property: `biometric_passport | biometric_id | kyc | aadhaar`.
- The terminal `onboarding_completed` event fires iff the proving machine reaches `completed` state **via a true new-registration proof** (not the `ALREADY_REGISTERED` shortcut, not a `disclose` proof). Disclosure proofs get their own `disclosure_completed` event that is outside this funnel entirely.
- Screen-view (`Viewed X`) events are preserved as-is for Flows/Paths reports. They are not funnel steps.

## Canonical Event Set

| Event                     | Fires when                                                                                                  | Required properties                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `onboarding_started`      | User dismisses the privacy disclaimer and enters the onboarding flow                                        | `branch` (unknown at this stage → `pending`)                    |
| `country_selected`        | User confirms a country in `CountryPickerScreen`                                                            | `branch` (still `pending`), `country_code`                      |
| `document_type_selected`  | User confirms a document type in `IDSelectionScreen`                                                        | `branch` (now resolvable), `document_type`, `country_code`      |
| `document_scan_started`   | User opens camera (biometric branches), launches the KYC web SDK, or opens the Aadhaar file picker          | `branch`                                                        |
| `document_scan_succeeded` | MRZ+NFC committed (biometric), KYC provider returns success, Aadhaar upload accepted                        | `branch`, `duration_seconds`, `attempt_count`                   |
| `proof_generation_started`| Proving machine enters `proving` state                                                                      | `branch`                                                        |
| `proof_generation_succeeded` | Proving machine enters `completed` state with `circuitType === 'register'` (true new registration)       | `branch`, `duration_seconds`                                    |
| `onboarding_completed`    | Post-proof wrap-up done (terminal success state for the registration path)                                  | `branch`, `duration_seconds` (total onboarding)                 |

Supporting events (outside the funnel but on the same event stream):

| Event                     | Purpose                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `onboarding_failed`       | Terminal failure. Carries `{branch, stage, reason, recoverable}`. One event replaces 10+ named failure events for dashboard purposes — the detailed events still fire too. |
| `funnel_step_retried`     | User retried a step (e.g., NFC scan after a failure). Carries `{branch, stage, reason}`. Distinct from drop-off signal. |
| `disclosure_completed`    | Disclosure proof reached `completed` state. Outside the onboarding funnel. Kept for disclosure analytics.   |

## Branch Model

| `branch` value        | Flow                                                                                       | Canonical steps that apply           |
| --------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| `biometric_passport`  | Passport with chip; MRZ + NFC + proof                                                      | All 8 canonical steps                |
| `biometric_id`        | eID card with chip; same mechanism as passport, different chip-scan animation and UX       | All 8 canonical steps                |
| `kyc`                 | Embedded KYC provider web SDK (Didit) — used for non-biometric docs and as NFC/MRZ fallback | 5 steps: `onboarding_started` → `country_selected` → `document_type_selected` → `document_scan_started` → `document_scan_succeeded` → proof steps → `onboarding_completed` (no NFC visibility; interior selfie/liveness steps are opaque) |
| `aadhaar`             | India-specific QR/PDF upload                                                                | Same 8 steps conceptually; `document_scan_*` maps to file pick + upload accept |

Biometric passport and biometric ID are treated as distinct branches (different chip animations, different UX) but are rolled up into a `biometric_combined` dashboard view.

## Mixpanel Dashboard Plan

Built after event layer lands. One Mixpanel board:

1. **Macro onboarding funnel** — `onboarding_started → document_scan_succeeded → proof_generation_succeeded → onboarding_completed`. Uniques mode. Conversion window 30 min. Filter: `is_internal != true` (when that property ships; see backlog ANA-02).
2. **Per-branch funnels** — four boards, each filtered on `branch`. Biometric branches get the full 8 steps; KYC gets 5; Aadhaar gets its variant.
3. **Biometric combined rollup** — `branch in (biometric_passport, biometric_id)`, otherwise identical to a per-branch funnel.
4. **Failure breakdown** — `onboarding_failed` event, grouped by `stage` + `reason`. Tells us where and why, not just that.
5. **Retry heat** — `funnel_step_retried` by stage and branch. Retry spikes are a UX signal distinct from drop-off.

## Out of Scope (this workstream)

- TestFlight / internal-build contamination filtering (`build_channel`, `is_internal`). Deferred; see ANA-02.
- Cleanup of raw-string events (`REGISTRATION_FALLBACK_*`, `DEVICE_TOKEN_REG_*`) to typed constants. Deferred; see ANA-03.
- Consolidation of the Mixpanel NFC native channel vs Segment duplication. Deferred; see ANA-04. The dual firing is kept as-is because native-module events have no other path to reach the analytics backend.
- Migration of the KYC provider's interior steps (selfie, liveness, doc capture) into the funnel. Provider web SDK is a black box at that level; requires provider-side instrumentation contract work.

## Execution Model

- Stable context for this workstream lives in this file.
- PR-sized execution lives under [`plans/`](./plans/).
- Canonical event contract decisions live here; implementation deviations must be reconciled by updating this file.

## Backlog

| ID      | Title                                                                            | Status   | Priority | Depends On | Plan                                                                           | Notes                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------- | -------- | -------- | ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ANA-01  | Canonical onboarding funnel events + dead-zone and AbstractButton fixes          | Ready    | High     | -          | [plans/ANA-01-canonical-onboarding-funnel.md](./plans/ANA-01-canonical-onboarding-funnel.md) | The full "do now" scope: canonical events, state-machine guards, terminal event invariant, dead-zone fixes, `Click:` prefix fix.          |
| ANA-02  | Filter TestFlight and internal-build traffic from onboarding funnel              | Deferred | Medium   | ANA-01     | —                                                                              | Add `build_channel` super property and `is_internal` user property with a debug-menu toggle. Optionally separate Mixpanel project per env. |
| ANA-03  | Convert raw-string analytics events to typed constants across onboarding        | Deferred | Low      | ANA-01     | —                                                                              | `REGISTRATION_FALLBACK_*`, `DEVICE_TOKEN_REG_*`, and similar get moved into the existing event-constant enums. Cosmetic for the funnel, prevents future drift. |
| ANA-04  | Consolidate Mixpanel NFC native channel with Segment (if feasible)               | Deferred | Low      | ANA-01     | —                                                                              | Investigate whether native NFC events can be routed through Segment. Expected outcome: not feasible for native-module origin, keep as-is with a doc comment. |

Allowed statuses: `Ready`, `In Progress`, `Blocked`, `Deferred`, `Done`

## Active Plans

| Plan                                                                                    | IDs    | Status |
| --------------------------------------------------------------------------------------- | ------ | ------ |
| [plans/ANA-01-canonical-onboarding-funnel.md](./plans/ANA-01-canonical-onboarding-funnel.md) | ANA-01 | Ready  |

## References

- Mixpanel funnels: [funnels-advanced](https://docs.mixpanel.com/docs/reports/funnels/funnels-advanced) — Uniques vs Totals counting, conversion windows, Optimized Re-entry, specific vs any-order modes.
- Mixpanel identity: [identifying-users](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users) — ID merge requires an event *after* `identify()` carrying both `$device_id` and `$user_id`.
- Mixpanel retention: [retention](https://docs.mixpanel.com/docs/reports/retention) — retention is for "came back days later," not multi-step completion. Use funnels for onboarding drop-off.
