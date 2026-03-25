# WV-10: EU ID Defer Record

> Last updated: 2026-03-25
> Status: Deferred
> Priority: Low
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

The current registration migration is mock-first and provider-agnostic. Future
logic work may use a provider-backed KYC contract, but that is not the
implementation boundary for this pass.

EU ID is **not** part of the active registration screen-migration pass. If Self
supports EU ID in the future, it will be a **separate Self-owned flow**, not a
helper layer inside the current mocked KYC registration flow.

This spec records that decision so the webview backlog does not accidentally
pull EU ID back into the active registration migration or treat it as part of
the current mocked-flow work.

## Decision

### 1. EU ID is not part of the active registration migration

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

The active migration should stay focused on the core registration/onboarding
screens and temporary mocked states. EU ID is a separate follow-up.

### 2. EU ID is deferred beyond the initial webview release

The six EU ID screens are **not approved for route integration** in the active
webview app and are **not part of the initial webview release**.

Current planning assumption: EU ID, if still wanted, is a **3.1 follow-up**
alongside Aadhaar and Points rather than part of the active webview pass.

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

The current webview registration path continues without EU ID for the initial
release.

## Scope

This is a **decision spec**. It does not migrate or integrate the six screens.

### In scope

- Record that EU ID is outside the active registration migration
- Remove ambiguity from the webview backlog and planning docs
- Define the correct ownership boundary for future EU ID work
- Mark the six EU ID screens as deferred from the active webview route spine and initial release

### Out of scope

- Creating any of the six Euclid wrapper screens
- Adding EU ID routes to `packages/webview-app/src/App.tsx`
- Building a separate Self-owned EU ID flow
- Shipping EU ID as part of the initial webview release
- Reintroducing camera or NFC capture into the provider-backed registration path
- Changing `WV-05`, `WV-06`, or `WV-09` route behavior

## What You Will Do

### 1. Update planning language to reflect the decision

**Files:**

- `specs/projects/sdk/workstreams/webview/SPEC.md`
- `specs/projects/sdk/workstreams/webview/TICKET-PLAN.md`
- `specs/projects/sdk/workstreams/webview/SCREEN-INVENTORY.md`

Update wording so `WV-10` is described as a **deferred follow-up record**, not
an implementation bucket inside the provider flow or the initial release train.

Required changes:

- `SPEC.md`: describe `WV-10` as a deferred EU ID follow-up, out of initial webview scope
- `TICKET-PLAN.md`: remove wording that implies the EU ID screens are the next
  registration sub-step after provider-backed registration
- `SCREEN-INVENTORY.md`: keep the six screens inventoried, but note they are
  deferred from the active webview migration path and targeted no earlier than
  mobile app 3.1 pending a separate Self-owned flow decision

### 2. Do not add implementation tickets under this spec

`WV-10` should not create implementation PR slices for these screens right now.

If follow-up tickets are needed, they should be limited to documentation and
backlog cleanup, for example:

- `Record EU ID exclusion from the initial webview release`
- `Carry EU ID as a mobile app 3.1 follow-up`

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

- **Do not expand the active pass.** EU ID stays outside the current
  registration migration and outside the current mocked-flow work.
- **No native scan assumptions.** `WV-03` removed camera/NFC-native ownership
  from the active webview migration path. `WV-10` must not reverse that.
- **Inventory is not commitment.** Keeping the six EU ID screens in
  `SCREEN-INVENTORY.md` does not mean they belong in the current route spine.
- **Future EU ID work requires a new spec.** If product approves a separate
  Self-owned EU ID flow later, write a new implementation spec for that flow
  rather than expanding this defer record.
  rather than expanding this defer record.

## Resolved Questions

1. **Can we just follow the mobile app?** Not for the initial webview release.
   The RN app still contains native camera/NFC scanning and fallback behavior,
   which is not the contract for the provider-first webview flow.

2. **Should EU ID be inserted before or after the mocked KYC/provider screens?**
   No. EU ID is not part of the active registration migration.

3. **Should the six screens become helper/prep screens for the mocked KYC flow?**
   No. They remain deferred follow-up work.

4. **Do the six screens need to be deleted from planning docs?** No. Keep them
   inventoried, but mark them as deferred from the active migration path.

## Validation

This spec is complete when:

- `WV-10` is described consistently as a deferred follow-up across planning docs
- no planning doc implies the six EU ID screens belong in the provider-backed route chain
- the active implementation order continues from `WV-09` to `WV-11` without EU ID integration work
- planning docs state that EU ID is out of the active pass and targeted no
  earlier than 3.1 with Aadhaar and Points

## Definition of Done

- [ ] `WV-10` plan file exists in `plans/`
- [ ] `SPEC.md` wording no longer implies EU ID is part of provider-backed registration
- [ ] `TICKET-PLAN.md` wording no longer implies EU ID is the next registration helper flow
- [ ] `SCREEN-INVENTORY.md` marks the six screens as deferred from the active webview migration path and initial release
- [ ] No webview route or screen implementation work is created under `WV-10`
