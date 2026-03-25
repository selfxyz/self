# WV-10: EU ID Helper-Flow Decision

> Last updated: 2026-03-25
> Status: Ready
> Priority: High
> Depends on: WV-09 (Ready)

- Workstream: webview
- Backlog ID: WV-10
- Linear: SELF-2419
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The remaining unmigrated EU ID screens were originally grouped as a possible
"helper flow" around registration:

- `EuIdInstructionsScreen`
- `EuIdBackInstructionsScreen`
- `EuIdViewfinderScreen`
- `EuIdCanInstructionsScreen`
- `EuIdNfcInstructionsScreen`
- `EuIdNfcSuccessScreen`

That framing is no longer correct for the active webview migration.

The current registration spine is provider-first. `WV-05` and `WV-06` define a
KYC provider launch/result contract where the provider owns document capture,
scan guidance, and verification onboarding. Sumsub, Didit, and similar
providers already supply their own guided UX for camera capture and document
verification.

EU ID is **not** part of that provider-backed path. If Self supports EU ID in
the future, it will be a **separate Self-owned flow**, not a provider helper
layer inside Sumsub/Didit registration.

This spec records that decision so the webview backlog does not accidentally
re-introduce native-scan assumptions into the provider flow.

## Decision

### 1. EU ID is not part of provider-backed registration

Do **not** insert the EU ID screens into the active registration chain:

```text
/onboarding/tour/:step
  → /onboarding/country
  → /onboarding/id-type
  → /onboarding/provider
  → /onboarding/provider-result
  → /onboarding/confirm
  → registration outcomes / prompts
```

Provider-owned onboarding stays inside the provider SDK or hosted provider
experience. Self does not wrap or duplicate that onboarding with Euclid
instruction screens.

### 2. EU ID remains a separate product decision

The six EU ID screens are **not approved for route integration** in the active
webview app.

If product later decides to support EU ID in webview, that work must be scoped
as a separate Self-owned flow with its own:

- route spine
- platform capability requirements
- bridge/native dependency review
- success/failure contracts
- document persistence contract

That future work is outside `WV-10`.

### 3. Current migration behavior

For the active migration:

- Do not create routes for the six EU ID screens in `packages/webview-app`
- Do not route any provider-backed registration action into EU ID screens
- Do not adapt the EU ID screens into "provider prep" or "provider helper" UI
- Do not treat the mobile app's native scan flow as a contract for webview

The current webview registration path continues without EU ID.

## Scope

This is a **decision spec**. It does not migrate or integrate the six screens.

### In scope

- Record that EU ID is outside provider-backed registration
- Remove ambiguity from the webview backlog and planning docs
- Define the correct ownership boundary for future EU ID work
- Mark the six EU ID screens as deferred from the active webview route spine

### Out of scope

- Creating any of the six Euclid wrapper screens
- Adding EU ID routes to `packages/webview-app/src/App.tsx`
- Building a separate Self-owned EU ID flow
- Reintroducing camera or NFC capture into the provider-backed registration path
- Changing `WV-05`, `WV-06`, or `WV-09` route behavior

## What You Will Do

### 1. Update planning language to reflect the decision

**Files:**

- `specs/projects/sdk/workstreams/webview/SPEC.md`
- `specs/projects/sdk/workstreams/webview/TICKET-PLAN.md`
- `specs/projects/sdk/workstreams/webview/SCREEN-INVENTORY.md`

Update wording so `WV-10` is described as a **decision/defer item**, not an
implementation bucket inside the provider flow.

Required changes:

- `SPEC.md`: describe `WV-10` as the EU ID separation/defer decision
- `TICKET-PLAN.md`: remove wording that implies the EU ID screens are the next
  registration sub-step after provider-backed registration
- `SCREEN-INVENTORY.md`: keep the six screens inventoried, but note they are
  deferred from the active webview migration path pending a separate Self-owned
  flow decision

### 2. Do not add implementation tickets under this spec

`WV-10` should not create implementation PR slices for these screens right now.

If follow-up tickets are needed, they should be limited to documentation and
backlog cleanup, for example:

- `Record EU ID separation from provider registration`
- `Clean up backlog wording for deferred EU ID flow`

Do not open screen-migration tickets under `WV-10` unless product later
approves a separate EU ID flow.

### 3. Leave route and screen code unchanged

No webview app code changes are required by this spec.

## Files You Will Modify

| File                                                         | Change                                               | Risk     |
| ------------------------------------------------------------ | ---------------------------------------------------- | -------- |
| `specs/projects/sdk/workstreams/webview/SPEC.md`             | Clarify `WV-10` as decision/defer work               | **None** |
| `specs/projects/sdk/workstreams/webview/TICKET-PLAN.md`      | Remove provider-helper ambiguity                     | **None** |
| `specs/projects/sdk/workstreams/webview/SCREEN-INVENTORY.md` | Mark EU ID screens as deferred from active migration | **None** |

## Files You Will NOT Modify

| File                                             | Why                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/webview-app/src/App.tsx`               | No route integration happens in this spec                          |
| `packages/webview-app/src/screens/onboarding/**` | No screen migration or wrapper creation happens in this spec       |
| `packages/webview-app/src/screens/tunnel/**`     | Tunnel/proving flow unaffected                                     |
| `packages/mobile-sdk-alpha/**`                   | Mobile/native flows are not the webview contract                   |
| `app/src/screens/documents/scanning/**`          | RN native scan flow is reference context only, not migration scope |

## Files You May Create

None.

## Constraints

- **Provider-owned onboarding stays provider-owned.** Do not duplicate Sumsub,
  Didit, or similar onboarding guidance in Self-owned Euclid wrappers.
- **No native scan assumptions.** `WV-03` removed camera/NFC-native ownership
  from the active webview migration path. `WV-10` must not reverse that.
- **Inventory is not commitment.** Keeping the six EU ID screens in
  `SCREEN-INVENTORY.md` does not mean they belong in the current route spine.
- **Future EU ID work requires a new spec.** If product approves a separate
  Self-owned EU ID flow later, write a new implementation spec for that flow
  rather than expanding this decision doc.

## Resolved Questions

1. **Can we just follow the mobile app?** No. The RN app still contains
   native camera/NFC scanning and fallback behavior, which is not the contract
   for the provider-first webview flow.

2. **Should EU ID be inserted before or after provider launch?** No. EU ID is
   not part of provider-backed registration.

3. **Should the six screens become provider helper/prep screens?** No.
   Providers own their own onboarding guides and capture UX.

4. **Do the six screens need to be deleted from planning docs?** No. Keep them
   inventoried, but mark them as deferred from the active migration path.

## Validation

This spec is complete when:

- `WV-10` is described consistently as a decision/defer item across planning docs
- no planning doc implies the six EU ID screens belong in the provider-backed route chain
- the active implementation order continues from `WV-09` to `WV-11` without EU ID integration work

## Definition of Done

- [ ] `WV-10` plan file exists in `plans/`
- [ ] `SPEC.md` wording no longer implies EU ID is part of provider-backed registration
- [ ] `TICKET-PLAN.md` wording no longer implies EU ID is the next registration helper flow
- [ ] `SCREEN-INVENTORY.md` marks the six screens as deferred from the active webview migration path
- [ ] No webview route or screen implementation work is created under `WV-10`
