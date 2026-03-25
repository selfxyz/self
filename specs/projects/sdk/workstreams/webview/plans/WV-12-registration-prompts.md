# WV-12: Registration Prompts — Social Sign-On, Conflict, and Notifications

> Last updated: 2026-03-25
> Status: Ready
> Priority: Medium
> Depends on: WV-09

- Workstream: webview
- Backlog ID: WV-12
- Linear: TBD
- Owner: TBD
- Branch: TBD
- PR: TBD

## Why

These 4 screens sit in the registration/onboarding flow but are not required
to validate the minimum registration spine (tour → provider → outcome). They
handle post-registration concerns: backup method selection, alternative sign-in,
account conflict resolution, and push notification opt-in.

They were originally part of WV-09 but are split out so the critical
registration path can ship and be reviewed independently.

## Scope

**4 Euclid-backed screens**:

| Screen                           | Purpose                                  |
| -------------------------------- | ---------------------------------------- |
| `SocialSignOnMethodPickerScreen` | Choose backup method (Apple/Google/Seed) |
| `SocialSignOnPickerScreen`       | Simplified social sign-on picker         |
| `ConflictDetectedScreen`         | Account conflict resolution              |
| `PushNotificationPromptScreen`   | Enable push notifications                |

Plus route wiring and mocked state triggers for each screen.

## Explicit Boundary

### In scope now

- Euclid `1.2.3` screen migration and naming alignment
- faithful 1:1 visual parity for the 4 screens above
- mocked state triggers so each screen and branch is directly reachable
- wiring the post-registration prompt chain: success → backup → notifications →
  home (connecting to WV-09's success screen)

### Out of scope now

- real Apple/Google sign-in integration (requires native platform work)
- real account conflict resolution (requires backend infrastructure)
- real push notification registration (browser Notification API wiring is a
  later concern)
- seed phrase backup flow (WV-14)

For this pass, all sign-on and backup actions route to `/coming-soon` or
equivalent deferred state. The screens are visual shells with mocked
transitions.

## Design Standard

Same as WV-09: every screen is a **1:1 design port** from Euclid. No redesign
during migration.

## Mock Flow Strategy

The mocked prompt chain after a successful registration:

1. `ScanSuccessScreen` (WV-09) advances to `/onboarding/backup`
2. `SocialSignOnMethodPickerScreen` — dismiss advances to notifications
3. `PushNotificationPromptScreen` — dismiss advances to home

Edge-case branches:

- `ConflictDetectedScreen` — reachable via mock trigger, primary action
  continues registration, secondary action returns to home
- `SocialSignOnPickerScreen` — reachable via mock trigger, all sign-on actions
  route to `/coming-soon`

Example route shapes:

```text
/onboarding/backup?mock=default
/onboarding/signin?mock=default
/onboarding/conflict?mock=existing-account
/onboarding/notifications?mock=default
```

## PR Slices

### PR 1: Prompt wrappers and chain wiring

- create `SocialSignOnMethodPickerScreen`
- create `SocialSignOnPickerScreen`
- create `ConflictDetectedScreen`
- create `PushNotificationPromptScreen`
- wire the post-registration prompt chain
- make each screen directly reachable through mock triggers

## Files Expected In This Pass

| File                                                                                     | Role                        |
| ---------------------------------------------------------------------------------------- | --------------------------- |
| `packages/webview-app/src/screens/onboarding/SocialSignOnMethodPickerScreen.tsx`         | Backup method prompt        |
| `packages/webview-app/src/screens/onboarding/SocialSignOnPickerScreen.tsx`               | Sign-in prompt              |
| `packages/webview-app/src/screens/onboarding/ConflictDetectedScreen.tsx`                 | Conflict prompt             |
| `packages/webview-app/src/screens/onboarding/PushNotificationPromptScreen.tsx`           | Notification prompt         |
| `packages/webview-app/src/App.tsx`                                                       | Prompt routes               |

## Validation

This spec is complete when:

- the 4 prompt screens above are available as webview wrappers
- each wrapper is a faithful 1:1 Euclid design representation
- the post-registration prompt chain works end-to-end when wired to WV-09's
  success screen
- each screen is independently reachable via mock triggers
- sign-on actions route to deferred state

## Definition of Done

- [ ] `SocialSignOnMethodPickerScreen` renders at `/onboarding/backup`
- [ ] `SocialSignOnPickerScreen` renders at `/onboarding/signin`
- [ ] `ConflictDetectedScreen` renders at `/onboarding/conflict`
- [ ] `PushNotificationPromptScreen` renders at `/onboarding/notifications`
- [ ] post-registration prompt chain: success → backup → notifications → home
- [ ] sign-on actions route to `/coming-soon`
- [ ] each screen reachable via mock triggers
- [ ] `yarn workspace @selfxyz/webview-app build` passes
