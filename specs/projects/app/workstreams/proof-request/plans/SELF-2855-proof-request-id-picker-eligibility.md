# SELF-2855: Proof Request + ID Picker — show eligibility per ID for active perk

> Last updated: 2026-05-19
> Status: In Progress
> Priority: High
> Depends on: SELF-2862 (Google USAT detection helper — already shipped as `googleUsatGate`)
> Sibling: SELF-2805 (design), SELF-2856 (Perks Rail)

- Workstream: app / proof-request
- Linear: SELF-2855
- Owner: Justin Hernandez
- Branch: `justin/self-2855`
- PR: TBD
- Surface: React Native mobile app (`app/`). The WebView proof-request UI in
  `packages/webview-app/` is **out of scope** for this slice and will adopt
  the same pattern in a separate Euclid-side initiative.
- Designs:
  - Proof Request screen with perk row — Figma node `26164-20549`
  - ID Picker bottom sheet with perk row + dimmed siblings — Figma node `26164-20236`

## Why

The Proof Request screen and its "Select an ID" bottom sheet currently render
the active document name + security pill, but give no signal that the active
proof request unlocks a perk (e.g. Google Cloud Faucet for Google USAT). Users
who land on the screen with an ineligible ID selected — or who tap the picker
without realising other IDs are not NFC-eligible — drop out of the flow. This
slice adds a per-ID eligibility row that surfaces the perk and dims IDs that
can't satisfy the active perk's constraints.

## Scope

- Add a shared `PerkEligibilityRow` component that renders a perk logo + label
  pill ("ELIGIBLE FOR N PERK") under the active-ID selector on the proof
  request screen and under the selected row inside `IDSelectorSheet`.
- On the proof request screen, render the row only when the active proof
  request is gated by a known perk policy. Use `evaluateGoogleUsatGateForDocument`
  to decide; if the active document fails the gate, render nothing.
- In `IDSelectorSheet`, accept an `eligibility` map keyed by document id. Rows
  marked `ineligible` render dimmed (existing `disabled` styling), are not
  selectable, and fire `proof_request_ineligible_id_tapped` on tap. The
  currently selected row carries the `PerkEligibilityRow` as its subtitle slot.
- Wire three Mixpanel events through `trackEvent`:
  - `proof_request_picker_viewed` `{ perk_id, eligible_count, ineligible_count }`
  - `proof_request_id_selected` `{ id_type, perk_id, was_eligible }`
  - `proof_request_ineligible_id_tapped` `{ id_type, perk_id, reason }`
- Add the three event names to `KnownEventName` (the ANA-13 cap is enforced —
  unregistered events get dropped). Group them under a new
  `ProofRequestPickerEvents` const, mirroring `RegistrationPickerEvents`.
- WebView/Euclid mirror is NOT part of this slice. Tracked separately under
  `specs/projects/sdk/workstreams/webview/plans/WV-EUCLID-TODO.md` when picked
  up. Do not edit `packages/webview-app/` or `@selfxyz/euclid` in this PR.

## Out Of Scope

- Changing the perk catalogue. `getPerkRecordsForIdType` and the Google USAT
  gate are the only inputs; no new perk types added here.
- Server-side enforcement. The gate is UX only — the disclose backend already
  rejects ineligible documents (SELF-2862).
- Perks Rail (SELF-2856) — sibling work, lands separately.
- The `EligiblePerksCard` full-card variant on ID Details. Untouched.
- Reworking onboarding's `IDSelection` flow in `packages/mobile-sdk-alpha/src/flows/onboarding/id-selection-screen.tsx`. That is the document-type picker, not the proof-request ID picker.

## Required Files

Read first:

- `app/src/screens/verification/DocumentSelectorForProvingScreen.tsx` (host of `ProofRequestCard` + `IDSelectorSheet`, owns selection state)
- `app/src/components/proof-request/ProofRequestCard.tsx` (active-ID row, `documentName` prop)
- `app/src/components/documents/IDSelectorSheet.tsx` (bottom sheet shell)
- `app/src/components/documents/IDSelectorItem.tsx` (row primitive — `state` already supports a dimmed treatment via `expired`)
- `app/src/utils/googleUsatGate.ts` and `app/tests/src/utils/googleUsatGate.test.ts`
- `packages/mobile-sdk-alpha/src/data/perks.ts` (`PerkRecord`, `PerkId`, `getPerkRecordsForIdType` — data-only, no logo renderers)
- `packages/mobile-sdk-alpha/src/flows/onboarding/perks.tsx` (`Perk` type = `EligiblePerksItem`, `getPerksForIdType` — adds `renderLogos`; THIS is the UI-facing API and what `PerkEligibilityRow` consumes)
- `packages/mobile-sdk-alpha/src/constants/analytics.ts` (`KnownEventName`, `RegistrationPickerEvents` for the pattern)

Edit / create:

- `app/src/components/proof-request/PerkEligibilityRow.tsx` — NEW. Logo + label "ELIGIBLE FOR N PERK". Accepts `perks: Perk[]` (the UI type from `flows/onboarding/perks.tsx`, which carries `renderLogos`). Renders nothing when `perks.length === 0`. No tap handler in this slice.
- `app/src/components/proof-request/ProofRequestCard.tsx` — render `<PerkEligibilityRow />` below the existing active-ID row when `perks.length > 0` AND the active doc is eligible (parent decides; card just renders what's passed). Add `perks?: Perk[]` prop.
- `app/src/components/documents/IDSelectorItem.tsx` — extend `IDSelectorState` with `'ineligible'`. `getSubtitleText('ineligible')` returns "Not eligible" (default; design copy TBD — see Q2). `isDisabledState` returns `true` for `ineligible`. Accept optional `eligibilityChildren?: React.ReactNode` and render it under the subtitle for the active row only.
- `app/src/components/documents/IDSelectorSheet.tsx` — accept new props:
  - `activePerkId?: PerkId` — the singular perk for analytics. Computed by the parent from the *active proof request's* perk policy, NOT from `perksByDocumentId`. Used for all three event payloads.
  - `perksByDocumentId?: Record<string, Perk[]>` — drives `PerkEligibilityRow` in the selected row's `eligibilityChildren` slot. Multi-perk: render all logos in one row.
  - `ineligibleReasonByDocumentId?: Record<string, IneligibleReason>` — drives the `'ineligible'` state on rows and supplies `reason` for `_ineligible_id_tapped`.
  Fire `_viewed` on mount (use `useEffect` with `[]` deps), `_id_selected` in `onSelect`, `_ineligible_id_tapped` from a separate tap handler wired to ineligible rows (the row must still receive the tap even though `isDisabledState` blocks selection — pass an `onIneligibleTap` callback in addition to `onPress`).
- `app/src/screens/verification/DocumentSelectorForProvingScreen.tsx` — wire perk + eligibility:
  - Derive `activePerkId` from the active proof request's perk policy. For this slice, that's `'google_cloud_faucet'` iff `isGoogleUsatRequest(request)` (use the existing helper alongside `evaluateGoogleUsatGateForDocument`); otherwise `undefined` and the perk UI is skipped entirely.
  - Build `perksByDocumentId` by calling `getPerksForIdType(metadata.documentType)` per document.
  - Build `ineligibleReasonByDocumentId` by running `evaluateGoogleUsatGateForDocument` per document and keeping the failing ones with the returned `IneligibleReason`.
  - Pass the *active document's* `Perk[]` (or `[]` if active doc is ineligible) into `ProofRequestCard`'s `perks` prop. If the active doc is ineligible, also disable the Approve CTA (the existing `canApprove` already gates on `isDisabledState`; the new `'ineligible'` state will flow through that path automatically — verify in tests).
- `app/src/utils/googleUsatGate.ts` — change return type of `evaluateGoogleUsatGateForDocument` to also carry an `IneligibleReason` slug when the gate fails. Add `IneligibleReason` union there for now (Google USAT is the only consumer in-tree); leave a `// TODO:` line flagging that this will move to a shared `perkGate` module when a second perk policy lands.
- `packages/mobile-sdk-alpha/src/constants/analytics.ts` — add `ProofRequestPickerEvents` const and append it to the `KnownEventName` union.

Tests (new):

All new test files MUST sit under `app/tests/src/` (see [[feedback_test_memory_oom]] — the OOM guard scans that path; tests outside it bypass the guard and can OOM CI).

- `app/tests/src/components/proof-request/PerkEligibilityRow.test.tsx` — pluralisation, no render when `perks` empty, multi-perk logo row.
- `app/tests/src/components/documents/IDSelectorSheet.test.tsx` — extend existing if present, otherwise new. Cover: ineligible row is not selectable; tapping it fires `proof_request_ineligible_id_tapped`; `Select` button stays disabled while ineligible is highlighted; viewing the sheet fires `_viewed` exactly once per mount; `activePerkId` propagates into all three event payloads.
- `app/tests/src/screens/verification/DocumentSelectorForProvingScreen.test.tsx` (extend) — Google USAT request + mixed Aadhaar/Passport documents → Aadhaar lands in `ineligibleReasonByDocumentId` with `reason: 'needs_nfc'`; selecting the eligible row fires `_id_selected` with `was_eligible: true`; landing on the screen with a stale ineligible active doc → Approve disabled, no `PerkEligibilityRow`.

## Implementation Notes

- The "Eligible for 1 perk" pill in design 1 lives *inside* the active-ID card,
  below the country/document/HI-SECURITY row, on the same shared background.
  Implement as a separate row in `ProofRequestCard`; do not nest it into
  `IDSelectorItem` for that surface.
- In design 2 the non-active rows render with the existing dimmed treatment
  (`opacity: 0.6`, `textColor: slate400`) already implemented in
  `IDSelectorItem` for `expired`. Reuse those tokens — do not introduce new
  colours.
- The `ineligible` state must NOT collapse into `expired`. Expired IDs are
  permanently dead; ineligible IDs are perk-scoped and become eligible again
  for a different proof request. Keep them as distinct enum values; both can
  share `isDisabledState`.
- `reason` on `proof_request_ineligible_id_tapped` is a short slug, not a
  localised string. Define a `IneligibleReason = 'needs_nfc' | 'unsupported_id_type'`
  union in `googleUsatGate.ts` and return one from the gate. Default to
  `'unsupported_id_type'` when no specific reason is available.
- Keep `PerkEligibilityRow` props minimal (`perks: Perk[]` only). Logo
  rendering uses each `Perk.renderLogos?.()` from
  `flows/onboarding/perks.tsx`. Do NOT use `PerkRecord` from `data/perks.ts`
  for UI surfaces — it has no logo renderer (verified at the time of writing:
  `PerkRecord` carries only `id`, `label`, `isNew`, `outlinkUrl`).
- Pluralisation copy: "ELIGIBLE FOR 1 PERK" (singular) when `perks.length === 1`,
  "ELIGIBLE FOR N PERKS" otherwise. Today the catalogue only emits a single
  perk per id-type, but write the pluralisation now so the copy doesn't lie
  when SELF-2856 expands the catalogue. Confirm exact uppercase form with
  design if the screenshots ship before merge.

## Decisions (resolves the prior open questions in code)

- **Active selection can be `ineligible`.** If a user lands with a stale
  active doc that fails the gate, the active row renders dimmed with the
  `ineligible` state, no `PerkEligibilityRow` renders on the proof request
  card, and Approve is disabled via the existing `canApprove` path
  (`!isDisabledState(selectedDoc.state)`). Tests must cover this case.
- **Ineligible subtitle copy:** keep the row's existing state subtitle
  ("Verified ID" / "Testing document") and rely on dimming. Do not add a
  "Not eligible" line in the UI. The `reason` slug is analytics-only.
  Mark this with a `// TODO:` comment in `IDSelectorItem.tsx` linking the
  ticket so a designer review can change copy without code archaeology.

## Validation

```bash
# Targeted tests
cd app && yarn test \
  tests/components/proof-request/PerkEligibilityRow.test.tsx \
  tests/components/documents/IDSelectorSheet.test.tsx \
  tests/src/screens/verification/DocumentSelectorForProvingScreen.test.tsx

# SDK analytics types
cd packages/mobile-sdk-alpha && yarn types

# Repo gates
yarn lint && yarn types
```

Manual verification (cannot be unit-tested, see `feedback_euclid_assets`):

1. Launch the RN app, scan a Google USAT QR code with an NFC passport active → proof request shows "ELIGIBLE FOR 1 PERK" pill with the G logo.
2. Open the picker. Active row shows perk row in subtitle slot; siblings render dimmed but still tappable for analytics.
3. Switch the active proof request to a non-perked policy → perk row disappears.
4. With an Aadhaar-only profile, launch a Google USAT request → Aadhaar row dimmed in picker, tap fires `proof_request_ineligible_id_tapped` with `reason: 'needs_nfc'`.

## PR size estimate

~600–900 LOC changed across one new component, two extended components, one
screen, one util, one analytics const, and three test files. Well under the
3k target — no split needed.

## Backlog row

Indexed in [../SPEC.md](../SPEC.md) under the `proof-request` workstream.
