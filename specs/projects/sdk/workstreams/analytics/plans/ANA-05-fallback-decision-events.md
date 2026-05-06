# ANA-05: Fallback Decision Events

> Status: Done
> Last updated: 2026-04-29
> Depends on: ANA-01

## Summary

Layer 2 canonical events for fallback decision points: `Onboarding: Fallback Offered`, `Onboarding: Fallback Accepted`, `Onboarding: Fallback Declined`. Fires at every occurrence (NOT deduped like Layer 1 step events). Shares `attempt_id`, `initial_branch`, `current_branch` with Layer 1 for joining.

## Events Added

| Event                          | Properties                                                         |
| ------------------------------ | ------------------------------------------------------------------ |
| `Onboarding: Fallback Offered`   | `attempt_id`, `initial_branch`, `current_branch`, `from_stage`, `reason` |
| `Onboarding: Fallback Accepted`  | `attempt_id`, `initial_branch`, `current_branch`, `from_stage`, `reason` |
| `Onboarding: Fallback Declined`  | `attempt_id`, `initial_branch`, `current_branch`, `from_stage`, `reason` |

### Enums

- `FallbackStage`: `mrz_scan`, `nfc_scan`, `document_type_selected`, `document_scan`
- `FallbackReason`: `mrz_scan_failed`, `nfc_scan_failed`, `no_biometric_chip`, `user_cancelled`

## Files Modified

### SDK (`packages/mobile-sdk-alpha/`)

- `src/constants/analytics.ts` — Added 3 events to `OnboardingEvents`, added `FallbackStage` and `FallbackReason` enums
- `src/analytics/onboardingFunnel.ts` — Added `trackFallbackDecision` helper (not deduped, stamps with attempt properties + `from_stage` + `reason`)
- `src/index.ts` — Exported `trackFallbackDecision`, `FallbackReason`, `FallbackStage`

### App (`app/`)

- `src/hooks/useKycLauncher.ts` — Added `fromStage` and `reason` parameters to `showKycFallbackModal`; fires OFFERED/ACCEPTED/DECLINED inside the modal flow
- `src/screens/documents/scanning/DocumentCameraScreen.tsx` — Passes `FallbackStage.MRZ_SCAN, FallbackReason.USER_CANCELLED` to `showKycFallbackModal`
- `src/screens/documents/scanning/DocumentNFCScanScreen.tsx` — Passes `FallbackStage.NFC_SCAN, FallbackReason.USER_CANCELLED` to `showKycFallbackModal`
- `src/screens/documents/selection/DocumentOnboardingScreen.tsx` — Passes `FallbackStage.DOCUMENT_SCAN, FallbackReason.USER_CANCELLED` to `showKycFallbackModal`
- `src/screens/documents/scanning/RegistrationFallbackMRZScreen.tsx` — Fires OFFERED on mount, ACCEPTED on "Try a different method", DECLINED on "Try scanning again" (all with `FallbackStage.MRZ_SCAN, FallbackReason.MRZ_SCAN_FAILED`)
- `src/screens/documents/scanning/RegistrationFallbackNFCScreen.tsx` — Same pattern with `FallbackStage.NFC_SCAN, FallbackReason.NFC_SCAN_FAILED`
- `src/screens/documents/selection/LogoConfirmationScreen.tsx` — Fires OFFERED on "No" tap, ACCEPTED on modal primary button (both with `FallbackStage.DOCUMENT_TYPE_SELECTED, FallbackReason.NO_BIOMETRIC_CHIP`)

### Tests

- `tests/analytics/canonicalEvents.test.ts` — Updated to 14 events (added 3 fallback events)
- `tests/analytics/trackFallbackDecision.test.ts` — New: 5 tests covering bootstrap, payload shape, no-dedup, property merging, attempt_id sharing

## Fallback Offer Points

| Screen                          | Trigger                     | `from_stage`             | `reason`             |
| ------------------------------- | --------------------------- | ------------------------ | -------------------- |
| `useKycLauncher` modal          | Cancel button (3 screens)   | varies per caller        | `user_cancelled`     |
| `RegistrationFallbackMRZScreen` | Screen mount (auto-offered) | `mrz_scan`               | `mrz_scan_failed`    |
| `RegistrationFallbackNFCScreen` | Screen mount (auto-offered) | `nfc_scan`               | `nfc_scan_failed`    |
| `LogoConfirmationScreen`        | "No" button tap             | `document_type_selected` | `no_biometric_chip`  |

## Validation

- `yarn test` — 400 passed, 1 skipped, 0 failed
- `yarn types` — not run (app-side changes are in `.tsx` files outside SDK type check scope)
