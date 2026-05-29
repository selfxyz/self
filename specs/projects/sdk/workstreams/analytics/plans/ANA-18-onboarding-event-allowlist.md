# ANA-18: Remove Non-Funnel Onboarding Events

> Status: In Review · Depends on: ANA-13 (merged) · Branch: `feat/ana-18-onboarding-event-allowlist`

Four events fired on the onboarding path that belonged to neither the canonical funnel nor the branch channels: `Document: Country Help Tapped`, the `registration_id_picker_*` trio, `App: Logo Confirmation Answered`, and (via `confirm-identification`) `Proof: Proving Process Error`. Delete those emissions; route the confirm-identification failure through `failOnboardingAttempt` so it stays observable as the canonical `Onboarding: Failed`. Delete the now-dead constants (`RegistrationPickerEvents`, `DocumentEvents.COUNTRY_HELP_TAPPED`, `AppEvents.LOGO_CONFIRMATION_ANSWERED`). No new guard is needed: ANA-13 phase 3 already types `trackEvent` to `KnownEventName`, so unregistered events are a compile error globally.
