# WebView ↔ Euclid TODO

> Status: Active backlog
> Owner: WebView / Product Platform
> Parent: [Webview SPEC](../SPEC.md)

Running list of UI work that should land in `@selfxyz/euclid` (so WebView and the RN app share one implementation) before being adopted in either surface. Per CLAUDE.md: "Reusable UI belongs in shared libraries." Add new items below as they come up.

> Lineage reminder: `@selfxyz/euclid` 0.x is the RN lineage, 1.x is the web lineage. New shared components need a variant in each.

## How to use this doc

- One H2 per item. Keep each item self-contained so an agent can pick it up.
- Each item lists: **Why**, **Surfaces** (which screens consume it), **Component shape**, **Out of scope**, **Status**.
- When an item ships, mark `Status: Done` and link the PR. Don't delete — keeps the audit trail.

---

## Eligible Perks card

**Status:** TODO (not started)

**Why:** A first pass added an `EligiblePerksCard` directly into `packages/webview-app/src/screens/home/IDDataScreen.tsx`. Reverted on branch `codex/add-eligible-perks-card-to-id-data-view`. The same card is needed in the RN app at `app/src/screens/documents/management/IdDetailsScreen.tsx`, so the implementation belongs in Euclid, not in either consumer.

**Surfaces that will consume it:**

- `packages/webview-app/src/screens/home/IDDataScreen.tsx` — between `ExposedIDCard` and the `IdentificationDetailsCard` section.
- `app/src/screens/documents/management/IdDetailsScreen.tsx` — inside `ListHeader`, between the buttons row and the closing `YStack`.

**Component shape:**

- Name: `EligiblePerksCard` (or align with existing Euclid naming).
- Props: `perks: PerkRecord[]`, `onView?(perkIds)`, `onPerkPress?(perkId)`, `renderLogo` slot per perk so each consumer wires the platform-correct image element.
- Data source: `getPerkRecordsForIdType` from `@selfxyz/mobile-sdk-alpha/browser` (kept on this branch).
- Tokens only — `@selfxyz/euclid-core` spacing/colors, no raw hex.
- Empty state + accessibility (`aria-label` web / `accessibilityLabel` RN).

**Adoption follow-ups (after Euclid lands):**

- Re-add analytics events `id_data_perks_viewed` / `id_data_perk_tapped` to `packages/mobile-sdk-alpha/src/constants/analytics.ts` (an `IDDataEvents` group was removed during revert).
- Ship `google-g.svg` (and any other perk logos) under `packages/webview-app/public/logos/` for the WebView consumer.
- WebView screen currently uses `MOCK_ID_TYPE = 'p'` until WV-14 lands; switch to the real document type when that ships. RN screen should use the connected document's `idType` from day one.

**Out of scope:**

- Changing the perk data model in `packages/mobile-sdk-alpha/src/data/perks.ts`.
- Reworking `IdCardLayout` / `ExposedIDCard`.
- The unrelated layout bug on `app/src/components/homescreen/IdCard.tsx` where "AUTHORITY" overlaps the wrapped "United States of America" nationality value — investigate separately.

---

## Validation (applies to every item in this doc)

```bash
# Euclid build (run in both lineages used)
yarn workspace @selfxyz/euclid build && yarn workspace @selfxyz/euclid test

# Webview consumer
(cd packages/webview-app && yarn build && yarn test)

# RN app consumer
(cd app && yarn test)

# Repo gates
yarn lint && yarn types
```
