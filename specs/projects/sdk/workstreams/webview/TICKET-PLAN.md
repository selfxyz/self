# Webview Migration — Ticket Planning

Plan for creating specs, candidate tickets, and PR slices for the remaining
webview screen migration work. This document is for planning only. It does not
create Linear tickets.

Last updated: 2026-03-25

Related docs:

- [Screen Inventory](./SCREEN-INVENTORY.md)
- [WebView Spec](./SPEC.md)
- [WV-09 Registration Core](./plans/WV-09-registration-core.md)
- [WV-10 EU ID Defer Record](./plans/WV-10-eu-id-helper-flow.md)

---

## Purpose

The current migration pass is **not** a production-logic pass.

The goal is to move the relevant Euclid registration and onboarding screens
into `packages/webview-app` as **faithful 1:1 design representations** with
temporary mocked states and route triggers. Those mocked routes may ship
temporarily in prod until a follow-up team replaces them with real flow logic.

This planning doc therefore optimizes for:

- screen parity first
- mocked flow coverage second
- production logic follow-up notes third

It does **not** treat WV-05, WV-06, WV-07, WV-08, or WV-11 as blockers for the
screen-migration work in this pass.

---

## Planning Assumptions

### 1. Design parity is the deliverable

The work in scope now is:

- port the relevant Euclid screens 1:1
- preserve layout, copy, illustration, CTA structure, and screen sequencing
- expose enough temporary mocked states to exercise the designs

The work out of scope now is:

- provider SDK integration
- KYC result persistence
- document storage
- lifecycle completion callbacks
- proving-machine wiring
- production navigation guards based on real data

### 2. Temporary mocked states are allowed in prod

We do not need a separate dev-only harness for this pass.

Temporary mocked routes and states may live in the shipped webview app until
the future production-logic pass replaces them. The spec should say that
clearly so there is no ambiguity about why mocked flows exist in a prod build.

### 3. Mock triggers must cover distinct flow branches

The migration needs a reliable way to trigger unique happy-path and error-path
screens so product, design, QA, and engineering can validate the flows.

Preferred trigger shapes:

- route params
- query params
- lightweight mock-state objects attached to route navigation

Examples:

- `/onboarding/tour/1`
- `/onboarding/provider?mock=success`
- `/onboarding/provider-result?mock=kyc-failure`
- `/onboarding/success?mock=default`
- `/onboarding/conflict?mock=existing-account`
- `/proving/result?mock=success`

The exact trigger API can evolve. The important part is that each screen and
branch is directly reachable without real backend or provider behavior.

### 4. Logic notes should stay in the specs

Future production wiring notes are still useful. Keep them in the specs, but
label them clearly as follow-up work for the later logic pass.

### 5. 3.1 deprioritized work stays out of the active migration

The current 3.1 bucket is:

- EU ID
- Aadhaar
- Points

Those flows should stay inventoried and ordered correctly, but they are not the
active work for this pass.

---

## Recommended Order

### Tier 0: Registration critical path (WV-09)

The minimum viable registration spine — the highest-priority work.

Order:

1. Tour screens (onboarding intro)
2. Existing country and ID screens (already done)
3. Mocked provider handoff via existing scaffold screens
4. Registration outcome screens (success, failure, KYC failure)
5. Home entry/exit points that connect the spine

### Tier 0.5: Registration prompts (WV-12)

Post-registration prompt screens, split from WV-09:

1. Backup method picker
2. Social sign-on picker
3. Account conflict resolution
4. Push notification prompt

### Tier 1: Disclose mock spine

After registration, migrate the disclose/proving screens as visual shells with
mocked request, generation, success, failure, pending, and receipt states.

### Tier 2: Support surfaces

Migrate the remaining support surfaces after the two main spines are visually
testable:

- ID data
- manage documents
- recovery and backup
- remaining settings follow-through

### Tier 3: Future logic follow-ups

Keep the existing logic-oriented specs in the backlog, but treat them as later
implementation work rather than blockers for the visual migration:

- `WV-05` provider SDK integration
- `WV-06` KYC result flow
- `WV-07` SelfClient assembly
- `WV-08` tunnel proving wiring
- `WV-11` disclose production wiring

---

## Ticket Shape

The right unit is not "one ticket per screen." The right unit is one coherent
mocked branch of the product narrative.

Recommended ticket groupings:

### WV-09 registration critical path

- PR 1: tour wrappers and entry routing
- PR 2: outcome wrappers + mocked provider handoff transitions

### WV-12 registration prompts

- PR 1: social sign-on, conflict, and notification prompt wrappers + prompt
  chain wiring

### WV-11 disclose mock migration

- request, generation, result, receipt, history, dialogue, and KYC support
  screens as visual mocks
- route-level trigger coverage for success, failure, pending, and empty states

### WV-13 through WV-16 support migrations

- proof overlays/history/post-proof support (WV-13)
- home/document management/ID data (WV-14)
- recovery and backup surfaces (WV-15)
- settings follow-through and support routes (WV-16)

### WV-10 defer record

- no screen implementation tickets
- documentation and backlog ordering only

---

## Naming Guidance

This migration should target `@selfxyz/euclid` `1.2.3`.

Use the newer generic `Kyc` naming in the planning docs instead of older
provider-specific naming. For example:

- `SumsubFailureScreen` → `KycFailureScreen`
- `SumsubPendingScreen` → `KycPendingScreen`
- `SumsubVerificationSuccessScreen` → `KycSuccessScreen`

The current KYC provider is Didit, but screen naming should stay
provider-agnostic so it does not need to change again if the provider changes.

---

## Open Decisions

Resolved:

1. The current pass is design-only, not production-logic integration.
2. Temporary mocked states may ship until a later team replaces them.
3. EU ID is deprioritized to 3.1 and is not part of the active registration
   migration.
4. Aadhaar and Points remain in the 3.1 bucket as well.
5. The migration should follow Euclid `1.2.3` naming and use generic `Kyc`
   screen labels.

Still open for implementation detail, not scope:

1. Whether the temporary mock driver is query-param based, route-state based, or
   a small shared mock store.
2. Whether a lightweight in-app screen chooser is useful in addition to direct
   route triggers.

---

## Validation Expectations

The planning set is ready when:

- registration screens can be migrated and reviewed without real provider logic
- specs consistently describe the work as 1:1 design migration with mocked
  states
- no doc implies that production KYC/persistence logic should be implemented in
  this pass
- EU ID, Aadhaar, and Points remain clearly deprioritized to 3.1
- generic `Kyc` naming replaces old Sumsub-specific screen naming where the UI
  is provider-agnostic
