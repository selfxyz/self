# ANA-15 — Per-attempt support reference on onboarding error screens

> Linear: TBD
> Workstream: [Onboarding Analytics & Funnel](../SPEC.md)
> Depends on: ANA-01 (canonical funnel attempt model), ANA-13 (cohort tag pipeline)
> Status: Ready
> Priority: Medium
> PR target: <300 LOC.

## Context

ANA-13 stamps `attempt_id` on every Sentry event captured during an active onboarding attempt. Support can already find a user's events in Sentry by `attempt_id:<uuid>` — but only if the user can tell support which `attempt_id` to search for.

Today the `attempt_id` is invisible to the user. When someone files a support ticket with *"I got stuck during scanning"*, support has to guess which Sentry event corresponds to that user, often by timestamp + country, which is noisy and fragile.

A persistent `support_uuid` (set as Sentry `user.id`) is the right cross-session identity and should be exposed in Settings — that's a separate, larger workstream. This spec is the **in-flow** counterpart: surface the `attempt_id` of the *currently active* onboarding attempt on the screens where a user is most likely to stop and ask for help.

## Decision

Render a small grey footer line — `Reference: <attempt_id>` — on onboarding error / trouble screens, **only when a funnel attempt is active**. Tap-to-copy. No-op when no attempt is active (e.g., user opens the screen via deep-link from a non-onboarding context, or after the attempt has already terminated).

This is a UI-only change. No new analytics events. No funnel-helper changes.

## Files modified

- `app/src/screens/kyc/KycFailureScreen.tsx` — add footer.
- `app/src/screens/documents/scanning/DocumentNFCTroubleScreen.tsx` — add footer.
- `app/src/screens/verification/ProofRequestStatusScreen.tsx` — add footer on the failure variant only.
- `app/src/screens/documents/aadhaar/AadhaarUploadErrorScreen.tsx` — add footer.
- `app/src/screens/kyc/KycConnectionErrorScreen.tsx` (if it exists; else skip) — add footer.
- `app/src/components/AttemptReference.tsx` (new) — the shared footer component.
- `packages/mobile-sdk-alpha/src/analytics/onboardingFunnel.ts` — export a stable read-only accessor for the active attempt's id (no new mutation surface).

## Implementation

### 1. Read-only accessor — `packages/mobile-sdk-alpha/src/analytics/onboardingFunnel.ts`

Add:

```ts
export function getCurrentAttemptId(): string | null {
  return currentAttempt?.id ?? null;
}
```

Exported from `packages/mobile-sdk-alpha/src/index.ts` alongside the existing `_getCurrentOnboardingAttempt` test-only helper. Stable public surface; safe for app code.

### 2. Shared footer component — `app/src/components/AttemptReference.tsx`

A small dumb component:

- Reads `attempt_id` via `getCurrentAttemptId()`.
- If null, renders nothing.
- If present, renders a centered grey caption: `Reference: <attempt_id>` with a tap target that copies the id to the clipboard and shows a one-second toast (`Reference copied`).
- Uses the existing typography tokens (`dinot`, `slate400`) — no new design.

Component is a pure render; no hooks beyond `useState` for the toast. Re-reading on mount is sufficient because attempts don't change identity mid-render — they only transition `null → uuid` or `uuid → null` at terminal events, and any screen that mounts after a terminal event will correctly see `null`.

### 3. Wire into the four target screens

Append `<AttemptReference />` to the bottom of each screen's main content stack, above the safe-area padding. Placement should be visually subordinate — `marginTop: 'auto'` to anchor to the bottom of the available space, or inside the existing footer block where one exists.

No conditional rendering at the call site; the component handles the empty case internally.

### 4. Tests

- `app/tests/src/components/AttemptReference.test.tsx`:
  - Renders nothing when `getCurrentAttemptId()` returns null.
  - Renders the id and copies on tap when an attempt is active.
  - Toast appears after tap and disappears after the timeout.
- No funnel-helper tests beyond confirming `getCurrentAttemptId()` returns the right value before / after `completeOnboardingAttempt()`.

## Out of scope

- Persistent `support_uuid` exposure in Settings — separate spec. Different identity, different surface, different support workflow.
- Localization of the `Reference:` label — follows whatever the existing screen-level i18n setup does.
- Server-side enrichment of support tickets with the captured `attempt_id` — separate ticketing / CRM integration.
- Showing the reference on **non-error** screens (the country picker, the loading spinner during NFC, etc.). Footer is only useful where the user is stopped and likely to copy it. Adding it everywhere is visual noise.
- Showing both `attempt_id` and `support_uuid` together on the same screen. If both ship later, the error screens prefer `attempt_id` (more specific); Settings is the only place `support_uuid` lives.

## Validation

```bash
cd app && yarn test src/components/AttemptReference && yarn types
```

### Manual verification

1. Build a non-`__DEV__` staging build with the new code.
2. Start an onboarding attempt (e.g., select country + document type).
3. Force a failure path that lands on one of the four target screens (e.g., trigger NFC error injection).
4. Verify the footer shows `Reference: <some uuid>`.
5. Tap → toast appears → paste into another app and verify the uuid matches the value in Sentry's `attempt_id` tag for the captured error event.
6. Force `Onboarding: Completed` (clear the attempt), navigate back to the same screen via dev-menu deep-link, and verify the footer is hidden (no active attempt).

## Done criteria

- Footer renders on all four target screens when an attempt is active, is hidden when not.
- Tap-to-copy works on iOS and Android.
- A support engineer can take a screenshot or copied id from a user, paste into Sentry's Issues search as `attempt_id:<uuid>`, and pull up the user's exact error event in under 10 seconds.
- Unit tests cover the empty-state and active-attempt branches.
- No new Mixpanel events introduced.

## Notes

- Why not show the `event_id` instead? `event_id` is per-Sentry-event; an attempt that produces three errors generates three event_ids. `attempt_id` is per-attempt and binds the whole forensic trail (breadcrumbs, replay, multiple errors) together.
- Why not auto-fill the support form with the attempt_id? Doing so requires the user to actually open the support form. A visible reference label lets them screenshot, chat-paste, or read it over the phone without going through any specific funnel. Auto-fill can layer on later.
- Why a footer rather than an inline error code? The visual hierarchy on these screens already carries the user's emotional state (something failed). Stuffing a uuid into the primary message makes the screen feel more broken. Footer is the calm-affordance pattern used by Stripe, Linear, and most consumer support flows.
