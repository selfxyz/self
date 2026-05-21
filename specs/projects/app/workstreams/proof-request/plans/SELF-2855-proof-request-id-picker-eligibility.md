# SELF-2855: Proof Request + ID Picker — show eligibility per ID for active perk

> Last updated: 2026-05-19 (rewritten to match Figma 26164-20549 / 26164-20236 and PerkRail nodes 26166-26539 / 26166-26555; corrected host from `ProofRequestCard` to `BottomActionBar`; gate API kept backwards-compatible via new sync helper)
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
  - ID Picker bottom sheet with perk row — Figma node `26164-20236`
  - PerkRail component in isolation (proof request) — Figma node `26166-26539`
  - PerkRail component in isolation (picker) — Figma node `26166-26555`
  - Both PerkRail nodes resolve to the same atomic component:
    `[Google G in 32px white circle] ... [slate-200 pill: "ELIGIBLE FOR 1 PERK"]`
    laid out with `paddingHorizontal=10`, `paddingVertical=8`,
    `justifyContent="space-between"`, with bottom-left/bottom-right radius `16`
    when it sits as the lower half of a card (proof request) and `0` when it
    sits inline inside an `IDSelectorItem` (picker).

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
  pill ("ELIGIBLE FOR N PERK"). Two visual variants, driven by a single
  `variant: 'attached' | 'inline'` prop:
  - `attached` — bottom-rounded (16px); sits below the document-selector pill
    in `BottomActionBar` on the proof request screen.
  - `inline` — square corners; sits below the selected row's text inside
    `IDSelectorItem` in the picker.
- On the proof request screen, render the row inside `BottomActionBar`,
  immediately below the document-selector pill (the visible "active ID" card),
  only when the active proof request is gated by a known perk policy AND the
  active document passes the gate. If the active document fails the gate,
  render nothing (the perk row hides; the document-selector pill still renders
  alone).
- In `IDSelectorSheet`, accept eligibility + perks maps keyed by document id.
  Rows marked `ineligible` render dimmed (reusing the existing `expired`
  treatment tokens), are not selectable for proving, but DO receive taps so
  we can fire `proof_request_ineligible_id_tapped`. The currently selected
  row carries the `PerkEligibilityRow` (`variant="inline"`) below its
  subtitle text.
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
- Broader `BottomActionBar` redesign visible in node `26164-20549`: full-width
  layout with country flag, `HI-SECURITY` pill, and a separate black Approve
  pill below the selector card. Out of scope here — this slice only adds the
  PerkEligibilityRow beneath the existing selector pill. File a follow-up
  ticket if/when the action bar redesign lands.
- Picker active-row redesign visible in node `26164-20236`: blue-bordered card
  treatment around the active row replacing the current green-check radio.
  Out of scope — keep the existing active-row visuals; add only the perk row
  inside the active row's subtitle slot. File a follow-up if this is wanted.
- Per-row `HI-SECURITY` pills visible on every row in the picker design.
  Out of scope — sibling work.

## Required Files

Read first:

- `app/src/screens/verification/DocumentSelectorForProvingScreen.tsx` (host of `ProofRequestCard` + `BottomActionBar` + `IDSelectorSheet`, owns selection state and calls the gate)
- `app/src/components/proof-request/BottomActionBar.tsx` (visible "active ID" pill — this is the proof-request screen host for the attached PerkEligibilityRow. NOTE: `ProofRequestCard` does NOT contain an active-ID row — earlier spec drafts were wrong about that. The card holds the header + metadata + disclosure items; the active-ID label lives on `BottomActionBar.selectedDocumentName`.)
- `app/src/components/proof-request/ProofRequestCard.tsx` (read only — to confirm the active-ID row is not in here; no edits)
- `app/src/components/documents/IDSelectorSheet.tsx` (bottom sheet shell — wires data into rows)
- `app/src/components/documents/IDSelectorItem.tsx` (row primitive — `state` already supports a dimmed treatment via `expired`)
- `app/src/utils/googleUsatGate.ts` and `app/tests/src/utils/googleUsatGate.test.ts`
- `packages/mobile-sdk-alpha/src/data/perks.ts` (`PerkRecord`, `PerkId`, `getPerkRecordsForIdType` — data-only, no logo renderers)
- `packages/mobile-sdk-alpha/src/flows/onboarding/perks.tsx` (`Perk` type = `EligiblePerksItem`, `getPerksForIdType` — adds `renderLogos`; THIS is the UI-facing API and what `PerkEligibilityRow` consumes)
- `packages/mobile-sdk-alpha/src/constants/analytics.ts` (`KnownEventName`, `RegistrationPickerEvents` for the pattern)

Edit / create:

- `app/src/components/proof-request/PerkEligibilityRow.tsx` — NEW. Single
  component, single `variant: 'attached' | 'inline'` prop (default `inline`).
  Accepts `perks: Perk[]` (the UI type from `flows/onboarding/perks.tsx`,
  which carries `renderLogos`). Renders nothing when `perks.length === 0`.
  No tap handler in this slice. Layout: an `XStack` with
  `paddingHorizontal=10`, `paddingVertical=8`, `alignItems="center"`,
  `justifyContent="space-between"`; left side renders the merged
  `renderLogos()` output wrapped in a `width=32 height=32` `View` with
  `backgroundColor=white`, `borderWidth=1`, `borderColor=slate200`,
  `borderRadius=50`, `overflow="hidden"` (the inner logo renders at 24x24
  centered — that matches both the Google G and Usat svgs in
  `flows/onboarding/perks.tsx:15-17`). Right side renders a pill: `XStack`
  with `backgroundColor=slate200`, `borderRadius=30`,
  `paddingHorizontal=8`, `paddingVertical=4`, containing a `Text` with
  `fontFamily=dinot`, `fontSize=10`, `fontWeight="500"`, `color=slate800`,
  `letterSpacing=0.6`, `textTransform="uppercase"`, `allowFontScaling={false}`.
  The pill copy is computed via a new helper `getPerkRailLabel(perks)`
  (reuse the one in `packages/mobile-sdk-alpha/src/flows/onboarding/perks.tsx:38`,
  but uppercase it in the UI via `textTransform`, not by changing the helper —
  the helper is shared with other surfaces). When `variant === 'attached'`:
  add `borderBottomLeftRadius=16`, `borderBottomRightRadius=16`,
  `backgroundColor=white`. When `variant === 'inline'`: no radius, no
  background (host container provides it).
- `app/src/components/proof-request/BottomActionBar.tsx` — accept a new
  optional prop `perks?: Perk[]`. When `perks?.length` is truthy, render
  `<PerkEligibilityRow variant="attached" perks={perks} />` directly below
  the existing document-selector `Pressable`. To make the two visually read
  as one card with a shared bottom radius, wrap the document-selector
  `Pressable` and the perk row in a single `View` and move the
  `borderRadius`/`borderWidth` styling onto that wrapper (the wrapper gets
  `borderRadius=4` matching the existing pill when no perks, and gets
  `borderRadius=16` with bottom-rounded children only when perks are
  present — change the wrapper radius rather than introducing a new card
  primitive). Keep the Approve button untouched (it is the sibling
  XStack child today). Do NOT undertake the wider redesign — leave the
  blue Approve button and side-by-side layout in place.
- `app/src/components/documents/IDSelectorItem.tsx` — extend `IDSelectorState`
  with `'ineligible'`. `getSubtitleText('ineligible')` falls through to the
  existing `'verified'`/`'mock'` subtitle for the underlying doc state — we
  do NOT add a "Not eligible" line in the UI (see Decisions). For type
  exhaustiveness add a `case 'ineligible': return getSubtitleText({ ... })`
  branch or accept the prior subtitle text as a prop; pick whichever keeps
  the function pure and exhaustive without adding state inputs. `getSubtitleColor('ineligible')` returns `slate400`. `isDisabledState`
  returns `true` for `ineligible`. Accept a new optional prop
  `perkSlot?: React.ReactNode` (renders below the subtitle line, inside the
  `YStack`, with a small top margin — see Implementation Notes for spacing).
  Accept a new optional prop `onIneligiblePress?: () => void`. When state is
  `'ineligible'`, the Pressable's `onPress` calls `onIneligiblePress` (not
  `onPress`); `disabled` stays `false` so the press is received. When state
  is any other disabled state (`'expired'`), keep current behaviour
  (Pressable `disabled={true}`, no handler).
- `app/src/components/documents/IDSelectorSheet.tsx` — accept new props:
  - `activePerkId?: PerkId` — the singular perk for analytics. Computed by
    the parent from the _active proof request's_ perk policy, NOT from
    `perksByDocumentId`. Used for all three event payloads. When undefined,
    the sheet does not fire any of the three new events (the perk system is
    not engaged) and renders identically to today.
  - `perksByDocumentId?: Record<string, Perk[]>` — drives `PerkEligibilityRow`
    in the selected row's `perkSlot`. Only built for eligible documents
    (parent enforces — see screen edits). Multi-perk: a single
    `PerkEligibilityRow` renders all logos in one circle row.
  - `ineligibleReasonByDocumentId?: Record<string, IneligibleReason>` —
    presence of a key drives the `'ineligible'` state on the matching row
    AND supplies `reason` for `_ineligible_id_tapped`. The map is set by the
    parent only when the active proof request is gated (i.e. when
    `activePerkId` is set); otherwise it's undefined and rows render
    normally.
  - Behaviour: in the existing `documents.map` loop, when a doc's id is in
    `ineligibleReasonByDocumentId`, force `itemState = 'ineligible'` (this
    overrides the `'active' / verified / mock / expired` coercion). Pass
    `perkSlot={<PerkEligibilityRow variant="inline" perks={perksByDocumentId?.[doc.id] ?? []} />}` ONLY when `itemState === 'active'` and perks exist —
    other rows do not show the perk row in the picker.
  - Fire `_viewed` once per open: use `useEffect` keyed on `open` and a ref
    guard so re-renders don't double-fire. Reset the ref when `open`
    transitions to `false`. Payload includes `eligible_count` (docs not in
    ineligible map) and `ineligible_count` (docs in the map). Skip the
    event entirely when `activePerkId` is undefined.
  - `_id_selected` fires inside `onSelect` (wrap the parent callback with a
    local handler). `was_eligible` = `!ineligibleReasonByDocumentId?.[id]`.
    Skip when `activePerkId` is undefined.
  - `_ineligible_id_tapped` fires from the new `onIneligiblePress` handler
    wired through `IDSelectorItem`. `reason` reads from the map.
- `app/src/screens/verification/DocumentSelectorForProvingScreen.tsx` — wire
  perk + eligibility:
  - Derive `activePerkId`: `'google_cloud_faucet'` iff `selfApp` exists and
    `isGoogleUsatProofRequest(selfApp)` returns true (re-export the helper
    from `@selfxyz/mobile-sdk-alpha` if not already exposed; it lives next
    to `GOOGLE_USAT_FAUCET_POLICY` in the SDK and is already imported into
    `googleUsatGate.ts:11`). Otherwise `undefined`.
  - Build `perksByDocumentId` and `ineligibleReasonByDocumentId` together in
    a single `useMemo` keyed on `[allDocuments, selfApp, activePerkId]`:
    - Iterate every document in `allDocuments`.
    - For each, run a NEW pure helper
      `evaluateGoogleUsatEligibilityForDocument(app, doc)` (see gate edit
      below) which returns `{ eligible: boolean; reason?: IneligibleReason }`
      synchronously — no SelfClient or storage I/O — because the doc and
      app are already in memory.
    - If `eligible`, add `getPerksForIdType(documentType)` to
      `perksByDocumentId[id]` (skip when the array is empty so the row
      hides on docs without perks).
    - If not eligible, add `reason` to `ineligibleReasonByDocumentId[id]`.
    - Both maps are `undefined` (not just empty) when `activePerkId` is
      `undefined` so the sheet behaviour matches today on non-perk
      requests.
  - Pass the active document's `Perk[]` (or `undefined` if the active doc
    is ineligible or has no perks) into `BottomActionBar`'s new `perks`
    prop.
  - Pass `activePerkId`, `perksByDocumentId`, `ineligibleReasonByDocumentId`
    into `IDSelectorSheet`.
  - The existing `canApprove` already gates on `isDisabledState`. Because
    `'ineligible'` is added to that set in `IDSelectorItem.tsx`, the path
    flows through automatically. Verify in tests.
  - The runtime `evaluateGoogleUsatGateForDocument` calls in `handleSheetSelect`
    and `handleApprove` keep returning `'allow' | 'block'` — they remain
    untouched (we add a new pure helper rather than changing the existing
    gate signature; see gate edit below). They stay as a defense-in-depth
    server-style guard in case the in-memory eligibility map drifts from
    persisted state.
- `app/src/utils/googleUsatGate.ts` — add WITHOUT changing existing signatures:
  - Export a new union `IneligibleReason = 'needs_nfc' | 'unsupported_id_type'`.
  - Export a new pure function
    `evaluateGoogleUsatEligibilityForDocument(app: SelfApp, doc: { data: IDDocument; metadata: DocumentMetadata }): { eligible: boolean; reason?: IneligibleReason }`.
    Returns `{ eligible: true }` when the app is not Google USAT (the gate
    does not apply — caller will skip the perk system entirely via
    `activePerkId`). Otherwise checks `isDocumentEligibleForPolicy(GOOGLE_USAT_FAUCET_POLICY, doc.data.documentCategory, doc.data.mock)`
    and if `false`, picks a reason: `'needs_nfc'` when `documentCategory` is
    `'aadhaar'` (Aadhaar has no NFC chip path eligible for the policy),
    `'unsupported_id_type'` otherwise. Add a `// TODO: move to shared
perkGate module when a second perk policy lands` line.
  - Existing `evaluateGoogleUsatGate` and `evaluateGoogleUsatGateForDocument`
    keep their `'allow' | 'block'` contract and their async signatures so
    the runtime callers and tests in `app/tests/src/utils/googleUsatGate.test.ts`
    remain untouched.
- `packages/mobile-sdk-alpha/src/constants/analytics.ts` — add
  `ProofRequestPickerEvents` const (`VIEWED`/`ID_SELECTED`/`INELIGIBLE_ID_TAPPED`
  keys mapping to the snake_case event names listed under Scope) and append
  it to the `KnownEventName` union immediately after
  `RegistrationPickerEvents` to preserve grouping.

Tests (new):

All new test files MUST sit under `app/tests/src/` (see [[feedback_test_memory_oom]] — the OOM guard scans that path; tests outside it bypass the guard and can OOM CI).

- `app/tests/src/components/proof-request/PerkEligibilityRow.test.tsx` — pluralisation, no render when `perks` empty, multi-perk logo row.
- `app/tests/src/components/documents/IDSelectorSheet.test.tsx` — extend existing if present, otherwise new. Cover: ineligible row is not selectable; tapping it fires `proof_request_ineligible_id_tapped`; `Select` button stays disabled while ineligible is highlighted; viewing the sheet fires `_viewed` exactly once per mount; `activePerkId` propagates into all three event payloads.
- `app/tests/src/screens/verification/DocumentSelectorForProvingScreen.test.tsx` (extend) — Google USAT request + mixed Aadhaar/Passport documents → Aadhaar lands in `ineligibleReasonByDocumentId` with `reason: 'needs_nfc'`; selecting the eligible row fires `_id_selected` with `was_eligible: true`; landing on the screen with a stale ineligible active doc → Approve disabled, no `PerkEligibilityRow`.

## Implementation Notes

- The "Eligible for 1 perk" pill in design 1 lives _attached_ to the
  document-selector pill in `BottomActionBar`. Render it inside the bar (not
  in `ProofRequestCard`) — the card has no active-ID row to anchor to.
  Visually the two should read as a single card: change the wrapper radius
  to 16px on the bottom corners when perks are present so the seam between
  the selector pill and the PerkRail disappears.
- In design 2 the perk row sits inside the active row's container,
  below the subtitle text. Do not put it underneath the row separator and
  do not let it span across rows. Use the row's `YStack` (`IDSelectorItem.tsx:110`)
  as the parent and append a `View` with `marginTop=6` so it sits in the
  same dimensional rhythm as the subtitle. The row's `XStack` already
  enforces correct horizontal padding via the row's outer Pressable, so the
  inline PerkRail's own `paddingHorizontal=10` reads as a hair of inset
  inside the row — that matches the design crop.
- For ineligible siblings, reuse the existing dimmed treatment
  (`opacity: 0.6`, `textColor: slate400`) already implemented in
  `IDSelectorItem` for `expired`. Do not introduce new colours.
- The `ineligible` state must NOT collapse into `expired`. Expired IDs are
  permanently dead; ineligible IDs are perk-scoped and become eligible again
  for a different proof request. Keep them as distinct enum values; both can
  share `isDisabledState`.
- `ineligible` rows must still receive presses (analytics) — that's why
  `IDSelectorItem` uses `onIneligiblePress` rather than reusing the
  `disabled={true}` Pressable path used for `expired`. Expired rows stay
  unpressable.
- `reason` on `proof_request_ineligible_id_tapped` is a short slug, not a
  localised string. Definition lives in `googleUsatGate.ts` per gate-edit
  above. Default to `'unsupported_id_type'` when no specific reason applies.
- Keep `PerkEligibilityRow` props minimal: `perks: Perk[]` plus
  `variant?: 'attached' | 'inline'`. Logo rendering uses each
  `Perk.renderLogos?.()` from `flows/onboarding/perks.tsx`. Do NOT use
  `PerkRecord` from `data/perks.ts` for UI surfaces — it has no logo
  renderer (verified: `PerkRecord` carries only `id`, `label`, `isNew`,
  `outlinkUrl`).
- Pluralisation copy: "ELIGIBLE FOR 1 PERK" (singular) when `perks.length === 1`,
  "ELIGIBLE FOR N PERKS" otherwise. Today the catalogue only emits a single
  perk per id-type, but write the pluralisation now so the copy doesn't lie
  when SELF-2856 expands the catalogue. Source the string from
  `getPerkRailLabel(perks)` in `flows/onboarding/perks.tsx:38` and apply
  `textTransform="uppercase"` in the UI — do not branch the helper.
- Design tokens to use (verified against Figma node `26166-24555`): pill bg
  `slate200` / `#E2E8F0`, pill text `slate800` / `#1E293B`, font `dinot`
  size 10 weight 500 letterSpacing 0.6 uppercase; circle bg `white` border
  `slate200` 1px radius 50px size 32x32; row padding 10h/8v; attached-card
  bottom radius 16.

## Decisions (resolves the prior open questions in code)

- **Active selection can be `ineligible`.** If a user lands with a stale
  active doc that fails the gate, the active row in the picker renders
  dimmed with the `ineligible` state, no `PerkEligibilityRow` renders in
  `BottomActionBar` on the proof request screen, and Approve is disabled
  via the existing `canApprove` path (`!isDisabledState(selectedDoc.state)`).
  Tests must cover this case.
- **Ineligible subtitle copy:** keep the row's existing state subtitle
  ("Verified ID" / "Testing document") and rely on dimming. Do not add a
  "Not eligible" line in the UI. The `reason` slug is analytics-only.
  Mark this with a `// TODO:` comment in `IDSelectorItem.tsx` linking the
  ticket so a designer review can change copy without code archaeology.
- **`perksByDocumentId` is built for eligible docs only.** The parent runs
  `evaluateGoogleUsatEligibilityForDocument` per doc and only populates
  `perksByDocumentId[id]` when the doc passes the gate. Ineligible rows
  render dimmed with no perk row even though their id-type would otherwise
  match `getPerksForIdType`. Mock-passport-on-Google-USAT is the canonical
  case: id-type `'p'` would map to the Google Cloud Faucet perk, but the
  doc is mock so it lands in `ineligibleReasonByDocumentId` instead.
- **Gate API stays backwards-compatible.** `evaluateGoogleUsatGateForDocument`
  keeps returning `Promise<'allow' | 'block'>`. New pure helper
  `evaluateGoogleUsatEligibilityForDocument(app, doc)` returns
  `{ eligible, reason? }` synchronously for the UI eligibility map. No
  existing call sites need changes.

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

~700–1000 LOC changed across one new component (`PerkEligibilityRow`), three
extended components (`BottomActionBar`, `IDSelectorItem`, `IDSelectorSheet`),
one screen, one util (additive — new pure helper, no existing-signature
changes), one analytics const, and three test files. Well under the 3k
target — no split needed.

## Backlog row

Indexed in [../SPEC.md](../SPEC.md) under the `proof-request` workstream.
