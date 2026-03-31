# WV-09: Registration Core — Minimum Viable Registration Spine

> Last updated: 2026-03-25
> Status: Ready
> Priority: High
> Depends on: -

- Workstream: webview
- Backlog ID: WV-09
- Linear: SELF-2418
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

The webview app has pieces of the registration flow (country picker, ID
selection, provider scaffold screens) but is missing the bookends: the intro
tour at the start and the outcome screens at the end. A user currently has no
onboarding entry and sees no registration outcome feedback.

This spec covers the **minimum viable registration spine**: onboarding intro →
existing country/ID selection → mocked provider handoff → confirmation and
terminal outcome screens. This is the critical path for the current
design-migration pass.

Social sign-on, backup prompts, conflict resolution, and push notification
prompts are split into [WV-12](./WV-12-registration-prompts.md).

## Scope

**7 Euclid-backed screens** plus mocked provider handoff wiring:

| Group                 | Screens                                                                            | Count |
| --------------------- | ---------------------------------------------------------------------------------- | ----- |
| Tour                  | `LaunchTour1Screen`, `LaunchTour2Screen`, `LaunchTour3Screen`, `LaunchTour4Screen` | 4     |
| Registration outcomes | `ScanSuccessScreen`, `RegistrationFailureScreen`, `KycFailureScreen`               | 3     |

Plus the temporary mocked route wiring needed to make the full registration
spine navigable end-to-end.

## Explicit Boundary

### In scope now

- Euclid `1.2.3` screen migration and naming alignment
- faithful 1:1 visual parity for the 7 screens above
- entry from tour into existing country/ID selection flow
- mocked provider handoff via existing `ProviderLaunchScreen` /
  `ProviderResultScreen` scaffold screens
- mocked success, failure, cancel, and retry/dismiss transitions
- route guards and back/dismiss behavior for direct navigation
- transition from provider result into confirmation/outcome screens

### Out of scope now

- real provider SDK launch (WV-05, future logic pass)
- real KYC result handling (WV-06, future logic pass)
- document persistence
- onboarding state derived from production data
- lifecycle completion callbacks
- social sign-on, backup prompts, conflict detection, push notification
  (WV-12)
- analytics or haptic correctness beyond what is needed to render mocks
- replacing mocked flows with production behavior

If a change exists only to make the flow "real," it does **not** belong in
this pass.

## Design Standard

Every migrated screen in this spec should be treated as a **1:1 design port**
from Euclid.

That means preserving:

- visual layout
- copy and text hierarchy
- illustration and icon usage
- CTA structure and ordering
- spacing, alignment, and safe-area behavior
- route sequence as presented to users

Do not redesign the screens during migration.

### Asset Requirements

Euclid screens reference Lottie animations, background images, and fonts via
URL paths served from the app's `public/` directory. These are **not** bundled
by the euclid package. You must copy them from the
[euclid storybook public assets](https://github.com/selfxyz/euclid/tree/main/packages/storybook/public)
into `packages/webview-app/public/`.

For tour screens specifically:

| Asset path                              | Source                          |
| --------------------------------------- | ------------------------------- |
| `/animations/app-tour-welcome.json`     | `storybook/public/animations/`  |
| `/animations/app-tour-generate.json`    | `storybook/public/animations/`  |
| `/animations/app-tour-proof.json`       | `storybook/public/animations/`  |
| `/animations/app-tour-get-started.json` | `storybook/public/animations/`  |
| `/backgrounds/dialogue-background.jpg`  | `storybook/public/backgrounds/` |

See the **Euclid Screen Migration Checklist** in `CLAUDE.md` for the full
asset, inset, and validation protocol.

## Mock Flow Strategy

The webview app needs a temporary way to trigger unique registration branches
without real provider logic.

Accepted approaches:

- query params
- route params
- lightweight mock route state
- a very small shared mock-flow helper

The mocked registration spine must cover these transitions:

1. **Tour → country/ID** — tour step 4 advances into existing country picker
2. **ID selection → provider** — existing ID selection advances to mocked
   provider launch
3. **Provider → success** — mocked provider returns success, routes through
   confirmation to `ScanSuccessScreen`
4. **Provider → KYC failure** — mocked provider returns error, routes to
   `KycFailureScreen` with retry available
5. **Provider → registration failure** — non-retryable error routes to
   `RegistrationFailureScreen` with dismiss
6. **Provider → cancel** — user cancels, routes back or dismisses
7. **Failure → retry** — retry from failure screen re-enters provider handoff
8. **Success → home** — success screen advances to home (prompt chain from
   WV-12 is not wired in this spec)

Example route shapes:

```text
/onboarding/tour/1
/onboarding/provider?mock=success
/onboarding/provider-result?mock=kyc-failure
/onboarding/failure?mock=registration-failure
/onboarding/success?mock=default
```

These mocked routes may exist temporarily in prod until the later logic pass
replaces them.

## PR Slices

### PR 1: Tour wrappers and entry routing

- create the production onboarding tour wrapper for
  `LaunchTour1Screen` through `LaunchTour4Screen`
- wire the home/onboarding entry to the tour start
- tour step 4 exits to existing `/onboarding/country`

### PR 2: Outcome wrappers and mock transitions

- create `ScanSuccessScreen`
- create `RegistrationFailureScreen`
- create `KycFailureScreen`
- wire mocked provider handoff states in existing `ProviderLaunchScreen` /
  `ProviderResultScreen` so they route to the correct outcome screen
- make each screen directly reachable through mock triggers
- wire retry from failure back to provider, dismiss to home

## Files Expected In This Pass

| File                                                                        | Role                                |
| --------------------------------------------------------------------------- | ----------------------------------- |
| `packages/webview-app/src/screens/onboarding/TourScreen.tsx`                | Production wrapper for launch tour  |
| `packages/webview-app/src/screens/onboarding/ScanSuccessScreen.tsx`         | Registration success visual wrapper |
| `packages/webview-app/src/screens/onboarding/RegistrationFailureScreen.tsx` | Registration failure visual wrapper |
| `packages/webview-app/src/screens/onboarding/KycFailureScreen.tsx`          | Generic KYC failure visual wrapper  |
| `packages/webview-app/src/App.tsx`                                          | Tour routes + mocked outcome routes |

## Files Explicitly Not Required In This Pass

- `packages/webview-app/src/stores/onboardingStore.ts`
- `packages/webview-app/src/screens/onboarding/SocialSignOnMethodPickerScreen.tsx` (WV-12)
- `packages/webview-app/src/screens/onboarding/SocialSignOnPickerScreen.tsx` (WV-12)
- `packages/webview-app/src/screens/onboarding/ConflictDetectedScreen.tsx` (WV-12)
- `packages/webview-app/src/screens/onboarding/PushNotificationPromptScreen.tsx` (WV-12)
- provider result persistence changes
- document storage changes
- lifecycle result wiring
- proving-machine integration

## Future Production Follow-Up Notes

The later production-logic pass is expected to connect:

- real KYC provider (Didit) completion via WV-05
- normalized KYC result handling via WV-06
- document persistence
- real branch selection based on provider terminal states
- removal of temporary mock triggers from prod

Those notes belong in the specs for handoff context, but they should **not**
drive implementation work under `WV-09`.

## Validation

This spec is complete when:

- the 7 registration screens above are available as webview wrappers
- each wrapper is a faithful 1:1 Euclid design representation
- the mocked registration spine is navigable end-to-end: tour → country/ID →
  provider → success/failure
- mocked transitions cover success, KYC failure, registration failure, cancel,
  and retry
- route guards handle direct navigation without crashing
- no implementation task under this spec requires production KYC or persistence
  logic

## Definition of Done

- [ ] tour screens render at `/onboarding/tour/:step`
- [ ] tour step 4 exits to `/onboarding/country`
- [ ] home entry routes to `/onboarding/tour/1` when no document exists
- [ ] outcome screens render at mocked routes
- [ ] mocked provider handoff routes to correct outcome screen per mock state
- [ ] retry from failure re-enters provider handoff
- [ ] dismiss from failure returns to home
- [ ] success advances to home (WV-12 prompt chain not yet wired)
- [ ] direct navigation to outcome screens renders with generic fallback copy
- [ ] generic `Kyc` naming used throughout
- [ ] `yarn workspace @selfxyz/webview-app build` passes
