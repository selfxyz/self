# Webview Migration — Ticket Planning

Plan for creating specs, candidate tickets, and PR slices for the remaining webview screen migration work. This document is for planning only. It does not create Linear tickets.

Last updated: 2026-03-24

Related docs:

- [Screen Inventory](./SCREEN-INVENTORY.md)
- [WebView Spec](./SPEC.md)

---

## Purpose

The next planning step is not "create one ticket per screen." That would produce the wrong execution order and too much coordination overhead.

Instead, we should:

- group work by **flow boundary**
- align groups to **spec-sized contracts**
- split implementation into **PR-sized slices**
- order the work so each merged PR unlocks the next user-visible section of the flow

The ticket candidates below are intentionally larger than a single screen but smaller than a whole product area.

---

## Planning Checklist

Use this checklist to track planning readiness before creating Linear issues.

### Foundation specs

- [x] `WV-05` spec exists
- [x] `WV-05` issue created (SELF-2414)
- [ ] `WV-05` status wording updated to reflect contract/testing gap
- [x] `WV-06` spec exists in repo
- [x] `WV-06` issue created (SELF-2415)
- [x] `WV-07` spec exists
- [x] `WV-07` issue created (SELF-2416)
- [x] `WV-08` spec exists
- [x] `WV-08` issue created (SELF-2417)

### Proposed migration specs

- [x] `WV-09` spec created
- [x] `WV-09` issue group created (SELF-2418)
- [x] `WV-10` spec created
- [x] `WV-10` issue group created (SELF-2419)
- [x] `WV-11` spec created
- [x] `WV-11` issue group created (SELF-2420)
- [ ] `WV-12` spec created
- [x] `WV-12` issue group created (SELF-2421)
- [ ] `WV-13` spec created
- [x] `WV-13` issue group created (SELF-2422)
- [ ] `WV-14` spec created
- [x] `WV-14` issue group created (SELF-2423)
- [ ] `WV-15` spec created
- [x] `WV-15` issue group created (SELF-2424)

### Pre-ticket decisions

- [x] EU ID helper-flow role decided
- [ ] `ConfirmIdentificationScreen` step ownership decided
- [ ] primary proving surface decided (`tunnel` vs main proving route)
- [ ] `SumsubPendingScreen` / `SumsubVerificationSuccessScreen` product status decided

---

## Planning Principles

### 1. Sequence by user journey, not by component family

The real product path is:

1. launch and intro
2. registration entry
3. provider handoff and provider result normalization
4. registration success or failure
5. stored-document home state
6. disclose request and proof generation
7. proof result and history
8. recovery, settings, and lower-priority support surfaces

If we implement screens outside that order, we will create UI islands that are hard to validate end to end.

### 2. Separate contract work from screen migration work

WV-05, WV-06, WV-07, and WV-08 are not just visual migrations. They define the runtime boundary:

- provider launch and normalization
- KYC result persistence
- SelfClient / proving machine assembly
- register-to-disclose tunnel integration

Ticket planning should treat those as foundation specs, not "screen tickets."

### 3. Prefer PRs that close a usable branch of the flow

A good PR should leave the app in a more complete and testable state. The ideal unit is:

- one coherent route chain
- one backing contract
- one or two validation paths

Avoid PRs that only add scattered screens with no route completion.

### 4. Keep ticket shape close to ownership boundaries

The natural boundaries are:

- onboarding / registration
- provider contract and KYC normalization
- proving / disclose
- home / settings / recovery

These boundaries match the current route layout in `packages/webview-app/src/App.tsx` and the active webview specs.

---

## Recommended Order

### Priority tiers

The intended planning priority is:

1. **Tier 0: Foundation contracts**
   `WV-05`, `WV-06`, `WV-07`, `WV-08`
2. **Tier 1: Registration**
   Tour, provider handoff, provider result, registration outcomes, and registration-adjacent social sign-on / prompt screens
3. **Tier 2: Disclose**
   QR entry, proof request, generation, result, receipt/history, dialogues, and disclose support states
4. **Tier 3: Support surfaces**
   Home follow-through, document management, settings completion, and recovery / backup

This means ticket creation should prioritize **registration first, disclose second, related support screens third**.

There are **4 total tiers** in the planning model:

- `Tier 0` foundation
- `Tier 1` registration
- `Tier 2` disclose
- `Tier 3` support surfaces

### Phase 0: Foundation corrections before new migration tickets

Do not open the main migration ticket set until the existing foundation work is explicitly restated and de-risked.

Candidate planning items:

- restate WV-05 as "implementation present, contract validation incomplete"
- define WV-06 explicitly in a repo plan file before ticket creation
- confirm WV-07 and WV-08 remain the proving integration path
- keep screen-migration tickets dependent on those foundation specs where applicable

Why first:

- registration outcome screens depend on normalized provider terminal states
- proof flow screens depend on the proving machine and stored-document pipeline
- otherwise ticket sequencing will drift into mock-only UI

### Phase 1: Registration spine

This is the first user-visible product narrative and should be planned as a single ordered chain:

1. launch tour
2. country picker
3. ID type
4. provider launch
5. provider result
6. confirm identification
7. outcome screens
8. social sign-on conflict and backup prompts

The country and ID screens already exist, and provider launch/result already exist as webview-only screens. That means the first new migration effort should focus on the missing parts around them rather than reopening the whole onboarding surface.

Recommended planning order inside registration:

- Tour first, because it is the earliest missing user-facing entry point
- Registration outcomes second, because they define terminal states for real provider flows
- EU ID is explicitly out of the provider-backed registration spine and should be tracked as a separate decision/defer item, not a provider helper layer
- Social sign-on and push prompt last within WV-09, because they are registration-adjacent but not on the critical proof path

### Phase 2: Disclose spine

After registration spine planning, move to the proof request and result experience in this order:

1. QR entry
2. proof request review
3. proof generation
4. proof result
5. proof receipt and history
6. proof dialogues
7. sumsub pending / success and Nova splash where still needed

Why this order:

- QR and request review are the start of the disclose flow
- generation and result are the critical happy path
- receipt/history are post-completion support surfaces
- dialogue screens are mostly overlays and can be attached after the main route chain is stable

### Phase 3: Post-core support surfaces

These are valuable but not the shortest path to a usable 3.0 verification flow:

- ID data
- manage documents
- recovery and backup

These should be ticketed after the registration and disclose spines are planned.

---

## Screen Ordering Notes

### Registration flow ordering

The registration screens should not be planned as four unrelated buckets. The correct narrative is:

1. `LaunchTour1Screen`
2. `LaunchTour2Screen`
3. `LaunchTour3Screen`
4. `LaunchTour4Screen`
5. `CountryPickerScreen`
6. `IDSelectionScreen`
7. `ConfirmIdentificationScreen`
8. `ProviderLaunchScreen`
9. `ProviderResultScreen`
10. `ScanSuccessScreen` or `RegistrationFailureScreen` or `SumsubFailureScreen`
11. `SocialSignOnMethodPickerScreen` or `SocialSignOnPickerScreen`
12. `ConflictDetectedScreen` when the account path is ambiguous
13. `PushNotificationPromptScreen`
14. `HomeScreen`

Special note on EU ID screens:

- `EuIdInstructionsScreen`
- `EuIdBackInstructionsScreen`
- `EuIdViewfinderScreen`
- `EuIdCanInstructionsScreen`
- `EuIdNfcInstructionsScreen`
- `EuIdNfcSuccessScreen`

These sit inside the legacy registration journey, but the active webview scope no longer assumes Self-owned camera or NFC capture. Per WV-10, EU ID is not part of provider-backed registration and the six screens are deferred from the active webview migration path unless a separate Self-owned flow is approved in a future spec.

### Disclose flow ordering

The proof flow should be planned as:

1. `QRViewfinderScreen`
2. `ProofRequestScreen`
3. `ProofGenerationScreen`
4. `ProofGenerationDialogueScreen`
5. `ProofGenerationSuccessScreen`
6. `ProofResultScreen`
7. `ProofRequestReceiptScreen`
8. `ProofHistoryScreen`
9. `ProofSuccessBackupScreen`

Supporting overlays:

- `SimpleDialogueScreen`
- `DialogueWithCtaScreen`

Supporting status screens:

- `SumsubPendingScreen`
- `SumsubVerificationSuccessScreen`
- `NovaSplashScreen`

This ordering keeps the main proof path stable before adding support surfaces.

### Recovery and settings ordering

These should be planned after document persistence and home state are stable:

1. `ManageDocumentsScreen`
2. `IDDataScreen`
3. `LaunchRecoveryScreen`
4. `BackupMethodPickerScreen`
5. `RecoveryPhraseScreen`
6. `SecretPhraseInputScreen`
7. `RecoverySuccessScreen`

Reason:

- document management and ID data depend on stored document shape
- recovery UX should follow the same storage and account state assumptions

---

## Proposed Specs

The existing WV specs already cover foundational platform work. The remaining ticket planning should be grouped into a small set of migration specs rather than one spec per screen.

### Existing foundation specs

| Spec    | Purpose                                        | Status                                |
| ------- | ---------------------------------------------- | ------------------------------------- |
| `WV-05` | Sumsub Web SDK launch integration              | In progress                           |
| `WV-06` | KYC result flow and terminal mapping           | Ready, plan file still needed in repo |
| `WV-07` | SelfClient assembly and proving machine export | Ready                                 |
| `WV-08` | Tunnel proving integration                     | Ready                                 |

### Proposed new migration specs

| Proposed Spec | Scope                                                                   | Depends On   |
| ------------- | ----------------------------------------------------------------------- | ------------ |
| `WV-09`       | Registration core — tour, outcomes, social sign-on, and prompt surfaces | WV-05, WV-06 |
| `WV-10`       | EU ID separation decision and defer record                              | WV-09        |
| `WV-11`       | Disclose spine migration                                                | WV-07, WV-08 |
| `WV-12`       | Proof overlays, history, and post-proof support                         | WV-11        |
| `WV-13`       | Home, document management, and ID data                                  | WV-11        |
| `WV-14`       | Recovery and backup surfaces                                            | WV-13        |
| `WV-15`       | Settings follow-through and support routes                              | WV-13        |

Notes:

- `WV-09` should cover the route spine from tour through provider outcome and the remaining registration-adjacent social sign-on / prompt screens, not just the four tour screens.
- `WV-10` is intentionally separate because EU ID is not part of provider-backed registration; the six screens are deferred unless a separate Self-owned flow is approved.
- `WV-11` should establish the core disclose route chain before ticketing dialogue variants.

---

## Candidate Tickets By Spec

These are draft ticket groups only. Do not create them yet.

### WV-09: Registration core

Candidate tickets:

- `Registration intro and launch tour`
- `Registration terminal states and outcome screens`
- `Registration social sign-on, conflict, and prompt surfaces`
- `Registration route integration from tour to provider result`

Screens primarily affected:

- `LaunchTour1Screen`
- `LaunchTour2Screen`
- `LaunchTour3Screen`
- `LaunchTour4Screen`
- `ScanSuccessScreen`
- `RegistrationFailureScreen`
- `SumsubFailureScreen`
- `SocialSignOnMethodPickerScreen`
- `SocialSignOnPickerScreen`
- `ConflictDetectedScreen`
- `PushNotificationPromptScreen`
- integration around `CountryPickerScreen`, `IDSelectionScreen`, `ConfirmIdentificationScreen`, `ProviderLaunchScreen`, `ProviderResultScreen`

Suggested PR slices:

- PR1: Launch tour route and navigation
- PR2: Registration outcome states and route wiring
- PR3: Social sign-on, conflict, and prompt surfaces
- PR4: End-to-end registration spine integration and tests

### WV-10: EU ID separation decision

Candidate tickets:

- `Record EU ID separation from provider-backed registration`
- `Clean up backlog wording for deferred EU ID flow`

Screens primarily affected:

- `EuIdInstructionsScreen`
- `EuIdBackInstructionsScreen`
- `EuIdViewfinderScreen`
- `EuIdCanInstructionsScreen`
- `EuIdNfcInstructionsScreen`
- `EuIdNfcSuccessScreen`

Suggested PR slices:

- PR1: Product decision and spec
- PR2: Planning/backlog cleanup only if needed

### WV-11: Disclose spine migration

Candidate tickets:

- `QR entry and proof request review`
- `Proof generation and result route chain`
- `Disclose route integration with real proving pipeline`

Screens primarily affected:

- `QRViewfinderScreen`
- `ProofRequestScreen`
- `ProofGenerationScreen`
- `ProofResultScreen`

Suggested PR slices:

- PR1: QR and request review
- PR2: Generation and result
- PR3: Wire to proving pipeline and route guards

### WV-12: Proof overlays and post-proof surfaces

Candidate tickets:

- `Proof receipt and history`
- `Proof dialogue and CTA overlays`
- `Post-proof success and support surfaces`

Screens primarily affected:

- `ProofRequestReceiptScreen`
- `ProofHistoryScreen`
- `SimpleDialogueScreen`
- `DialogueWithCtaScreen`
- `ProofGenerationDialogueScreen`
- `ProofGenerationSuccessScreen`
- `ProofSuccessBackupScreen`
- `SumsubPendingScreen`
- `SumsubVerificationSuccessScreen`
- `NovaSplashScreen`

Suggested PR slices:

- PR1: Receipt and history
- PR2: Overlay dialogues
- PR3: Pending / success support states

### WV-13: Home and document surfaces

Candidate tickets:

- `ID data view`
- `Manage documents`
- `Home follow-through for registered document state`

Screens primarily affected:

- `IDDataScreen`
- `ManageDocumentsScreen`
- `HomeScreen` integration follow-up

Suggested PR slices:

- PR1: Manage documents
- PR2: ID data and home integration

### WV-14: Recovery and backup

Candidate tickets:

- `Recovery method selection and phrase display`
- `Phrase input and recovery success`

Screens primarily affected:

- `LaunchRecoveryScreen`
- `BackupMethodPickerScreen`
- `RecoveryPhraseScreen`
- `SecretPhraseInputScreen`
- `RecoverySuccessScreen`

Suggested PR slices:

- PR1: Method picker and phrase view
- PR2: Phrase input and success

### WV-15: Settings support routes

Candidate tickets:

- `Settings support and placeholder route completion`
- `Persisted settings follow-through`
- `Security, notifications, and dev-mode action completion`

Screens primarily affected:

- `SettingsScreen`
- `SecurityScreen`
- `NotificationPreferencesScreen`
- `DevModeScreen`

Suggested PR slices:

- PR1: Support and placeholder route completion
- PR2: Persistence and non-placeholder actions

---

## Proposed Ticket Creation Order

When we are ready to create Linear tickets, the recommended order is:

1. Foundation follow-up for `WV-05` and `WV-06`
2. `WV-09` registration spine
3. `WV-10` EU ID separation decision
4. `WV-07` and `WV-08` implementation tickets if still not created
5. `WV-11` disclose spine
6. `WV-12` proof overlays and post-proof surfaces
7. `WV-13` home and document surfaces
8. `WV-15` settings support routes
9. `WV-14` recovery and backup

This ordering keeps the shortest path to an end-to-end verification journey ahead of secondary account-management work.

Short version:

- Registration before disclose
- Disclose before support surfaces
- Support surfaces before long-tail polish or optional flows

---

## Open Questions Before Ticket Creation

These questions should be answered in docs before generating tickets:

1. Resolved: EU ID is not part of the provider-backed registration flow. Providers own their own onboarding guides.
2. Should `ConfirmIdentificationScreen` remain a distinct step before provider launch, or should it be folded into provider result / review?
3. Resolved: The main `/proving` route is the core disclose path (WV-11). Tunnel stays as the reference/demo flow from WV-08.
4. Are `SumsubPendingScreen` and `SumsubVerificationSuccessScreen` part of the end-user 3.0 flow, or are they implementation support states?
5. Should recovery and backup stay in the first migration wave, or explicitly move behind document-management completion?

Until those are resolved, we should plan tickets but avoid opening them.
