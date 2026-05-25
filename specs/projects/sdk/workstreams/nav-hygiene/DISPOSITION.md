# Nav-Hygiene · Route Disposition Table (NAV-01)

Authoritative classification of every route registered in
`packages/webview-app/src/App.tsx`, captured 2026-05-25 on the
`feat/webview-in-app` branch after the NAV-10 + NAV-02 deletions and
the NAV-12 mode-literal rename landed.

This table is the input NAV-02, NAV-08, NAV-10 (already executed),
NAV-11 (deferred), and NAV-13 consume. WV-13 / WV-14 read the
`self-app` rows for the wiring backlog. If a row's classification
changes, update this file in the PR that changes it.

> **Classification legend**
> - `self-app` — Self Wallet only (persistent UX, home, settings)
> - `embed` — Third-party host only (one-shot verification)
> - `shared` — Both modes can reach it; behavior may differ per mode
> - `dev` — Only registered when `import.meta.env.DEV`, only reachable via DevRouteMenu
> - `defer` — Stays registered with placeholder, wiring out-of-scope for v1 (NAV-11)
> - `delete` — Already removed (kept here for historical traceability)

## Self-app

| Route                                          | Component                          | Note                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `/`                                            | `HomeScreen`                       | Self Wallet home. Mode-gated entry point.                            |
| `/settings`                                    | `SettingsScreen`                   | Settings root.                                                       |
| `/settings/security`                           | `SecurityScreen`                   | Security settings (recovery phrase entry to /settings/recovery-phrase) |
| `/settings/notifications`                      | `NotificationPreferencesScreen`    | Push notification preferences.                                       |
| `/settings/dev-mode`                           | `DevModeScreen`                    | In-app dev mode toggle (not the same as build-time DEV gating).      |
| `/settings/backup`                             | `BackupMethodPickerScreen`         | Backup options.                                                      |
| `/settings/recovery-phrase`                    | `RecoveryPhraseScreen`             | Manage existing recovery phrase (distinct from onboarding generation). |
| `/recovery`                                    | `LaunchRecoveryScreen`             | Recovery entry. Reads `state.returnTo`.                              |
| `/recovery/phrase-input`                       | `SecretPhraseInputScreen`          | Secret phrase entry.                                                 |
| `/recovery/failure`                            | `RecoveryFailureScreen`            | Terminal failure.                                                    |
| `/recovery/success`                            | `RecoverySuccessScreen`            | Terminal success. Reads `state.returnTo`.                            |
| `/points`                                      | `PointsScreen`                     | Points dashboard.                                                    |
| `/points/invite`                               | `InviteScreen`                     | Invite flow under points.                                            |
| `/proving/receipt`                             | `ProofRequestReceiptScreen`        | Past-proof receipt detail.                                           |
| `/proving/history`                             | `ProofHistoryScreen`               | List of past proofs.                                                 |
| `/proving/backup-prompt`                       | `ProofSuccessBackupScreen`         | Canonical "all set, backup now" prompt (NAV-08 → `/register/success`). |
| `/account/verified`                            | `VerificationResultScreen`         | Account-verified state.                                              |
| `/id-data`                                     | `IDDataScreen`                     | View ID-data detail (NAV-08 → `/docs/:id`).                          |
| `/manage-documents`                            | `ManageDocumentsScreen`            | Document list (NAV-08 → `/docs`).                                    |
| `/coming-soon`                                 | `ComingSoonScreen`                 | Placeholder destination.                                             |
| `/proving/generation-success`                  | `ProofGenerationSuccessScreen`     | Self-app-specific success after register-proof generation. NAV-08 retires (consolidates into `/register/success`). |
| `/onboarding/notifications`                    | `PushNotificationPromptScreen`     | First-time notification prompt. NAV-08 → `/notify`.                  |

## Embed

| Route                                          | Component                          | Note                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `/tunnel/tour/:step`                           | `EmbedTourScreen`                  | Embed tour. NAV-08 collapses with `/onboarding/tour` into `/tour/:step` (mode-aware copy). |
| `/tunnel/kyc`                                  | `EmbedKycWrapper`                  | Embed-mode KYC entry redirect. NAV-08 retires entirely (boot navigates directly to `/capture/kyc`). |
| `/tunnel/kyc-failure`                          | `EmbedKycFailureScreen`            | NAV-08 → `/disclose/kyc-failure`.                                    |
| `/tunnel/kyc-success`                          | `EmbedKycSuccessScreen`            | NAV-08 → `/disclose/kyc-success`.                                    |
| `/tunnel/proof/receipt`                        | `EmbedProofReceiptScreen`          | NAV-08 → `/receipts/:id` (or `/disclose/receipt` if embed needs distinct UI). |
| `/tunnel/proof/generating`                     | `EmbedProvingScreen`               | NAV-08 → `/disclose/generating`.                                     |
| `/tunnel/proof/disclose`                       | `EmbedDiscloseScreen`              | NAV-08 → `/disclose/request`.                                        |
| `/tunnel/proof/result`                         | `EmbedResultScreen`                | NAV-08 → `/disclose/result`.                                         |
| `/tunnel/recovery-required`                    | `EmbedRecoveryRequiredScreen`      | NAV-08 → `/recover/required`.                                        |

## Shared

| Route                                          | Component                          | Note                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `/onboarding/tour/:step`                       | `TourScreen`                       | Self-app onboarding tour. NAV-08 collapses with `/tunnel/tour` into `/tour/:step`. |
| `/onboarding/country`                          | `CountryPickerScreen`              | NAV-08 → `/pick-country`.                                            |
| `/onboarding/id-type`                          | `IDSelectionScreen`                | NAV-08 → `/pick-id-type`.                                            |
| `/onboarding/provider`                         | `ProviderLaunchScreen`             | NAV-08 → `/pick-provider`. Mode-aware (embed vs self-app flow).      |
| `/onboarding/provider-result`                  | `ProviderResultScreen`             | NAV-08 → `/capture/provider-result`.                                 |
| `/onboarding/confirm`                          | `ConfirmIdentificationScreen`      | NAV-08 → `/capture/confirm`.                                         |
| `/onboarding/passport/instructions`            | `PassportInstructionsRoute`        | NAV-08 → `/capture/passport/instructions`.                           |
| `/onboarding/passport/code-scan-instructions`  | `PassportCodeScanInstructionsRoute`| NAV-08 → `/capture/passport/code-scan-instructions`.                 |
| `/onboarding/passport/code-scan-viewfinder`    | `PassportCodeScanViewfinderRoute`  | NAV-08 → `/capture/passport/code-scan-viewfinder`.                   |
| `/onboarding/passport/nfc`                     | `PassportNfcRoute`                 | NAV-08 → `/capture/passport/nfc`.                                    |
| `/onboarding/passport/nfc-success`             | `PassportNfcSuccessRoute`          | NAV-08 → `/capture/passport/nfc-success`.                            |
| `/onboarding/passport/nfc-error`               | `PassportNfcErrorRoute`            | NAV-08 → `/capture/passport/nfc-error`.                              |
| `/onboarding/eu-id/instructions`               | `EuIdInstructionsRoute`            | NAV-08 → `/capture/eu-id/instructions`.                              |
| `/onboarding/eu-id/back-instructions`          | `EuIdBackInstructionsRoute`        | NAV-08 → `/capture/eu-id/back-instructions`.                         |
| `/onboarding/eu-id/can-instructions`           | `EuIdCanInstructionsRoute`         | NAV-08 → `/capture/eu-id/can-instructions`.                          |
| `/onboarding/eu-id/code-scan-viewfinder`       | `EuIdViewfinderRoute`              | NAV-08 → `/capture/eu-id/code-scan-viewfinder`.                      |
| `/onboarding/eu-id/nfc-instructions`           | `EuIdNfcInstructionsRoute`         | NAV-08 → `/capture/eu-id/nfc-instructions`.                          |
| `/onboarding/eu-id/nfc-success`                | `EuIdNfcSuccessRoute`              | NAV-08 → `/capture/eu-id/nfc-success`.                               |
| `/onboarding/aadhaar/instructions`             | `AadhaarAppInstructionsRoute`      | NAV-08 → `/capture/aadhaar/instructions`.                            |
| `/onboarding/aadhaar/upload-success`           | `AadhaarUploadSuccessRoute`        | NAV-08 → `/capture/aadhaar/upload-success`.                          |
| `/onboarding/aadhaar/upload-error`             | `AadhaarUploadErrorRoute`          | NAV-08 → `/capture/aadhaar/upload-error`.                            |
| `/onboarding/registering`                      | `RegisteringScreen`                | NAV-08 retires; canonical register flow becomes `/register/generating`. |
| `/onboarding/success`                          | `ScanSuccessScreen`                | NAV-08 retires (consolidates into `/register/success`).              |
| `/onboarding/recovery-phrase`                  | `OnboardingRecoveryPhraseScreen`   | NAV-08 → `/backup-phrase` (top-level, distinct from `/settings/recovery-phrase`). |
| `/onboarding/failure`                          | `RegistrationFailureScreen`        | NAV-08 → `/register/failure`.                                        |
| `/onboarding/kyc-failure`                      | `KycFailureScreen`                 | NAV-08 → `/disclose/kyc-failure`.                                    |
| `/proving`                                     | `ProvingScreen`                    | Mode-aware proof request screen. NAV-08 → `/disclose/request`.       |
| `/proving/qr-scan`                             | `QRViewfinderScreen`               | QR scanner. Mode-aware proof intake.                                 |
| `/proving/generating`                          | `ProofGenerationRouteScreen`       | NAV-08 → `/register/generating` or `/disclose/generating`.           |
| `/proving/result`                              | `DiscloseResultScreen`             | NAV-08 → `/disclose/result`.                                         |
| `/proving/kyc-pending`                         | `KycPendingScreen`                 | Shared by self-app and embed (NAV-08 → `/disclose/kyc-pending`).     |
| `/proving/kyc-success`                         | `KycSuccessScreen`                 | Shared (NAV-08 → `/disclose/kyc-success`).                           |

## Dev

| Route                                          | Component                          | Note                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `/dev/keychain`                                | `KeychainDebugScreen`              | DEV-gated. NAV-02 moved here from `/debug/keychain`.                 |
| `/tunnel/kyc-pending` (DEV-gated)              | `EmbedKycPendingScreen`            | DEV-gated dev fixture for the embed KYC-pending state. NAV-08 sweeps the path to `/disclose/kyc-pending` (the DEV gate moves with it). |

## Deferred (post-v1)

| Route                                          | Component                          | Note                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `/onboarding/backup`                           | `SocialSignOnMethodPickerScreen`   | Social sign-on backup picker. Euclid screen not built — NAV-11 defers wiring. Stays registered with TODO-WV-12 placeholder. |
| `/onboarding/signin`                           | `SocialSignOnPickerScreen`         | Social sign-on provider picker. Deferred (NAV-11).                   |
| `/onboarding/conflict`                         | `ConflictDetectedScreen`           | Account conflict resolution. Deferred (NAV-11).                      |

## Deleted (historical record)

| Route                                          | Removed in    | Why                                                                  |
| ---------------------------------------------- | ------------- | -------------------------------------------------------------------- |
| `/tunnel/registration/country`                 | NAV-10        | Dev sub-flow bypassing KYC. Zero production callers.                 |
| `/tunnel/registration/id-type`                 | NAV-10        | Same.                                                                |
| `/proving/dialogue`                            | NAV-02        | Clunky, unused. Rebuild tracked as `fb-006` in FUTURE-BACKLOG.       |
| `/proving/dialogue-cta`                        | NAV-02        | Same.                                                                |
| `/proving/generation-dialogue`                 | NAV-02        | Same.                                                                |
| `/debug/keychain`                              | NAV-02        | Renamed to `/dev/keychain` (path move, screen unchanged).            |

## Catch-all

| Route                                          | Component                          | Note                                                                 |
| ---------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `*`                                            | `InitialRouteRedirect`             | Catch-all. Reads boot intent and routes to mode-appropriate entry.   |

## Consumers

- **NAV-02** — read the `dev` rows. (Done — see commit history.)
- **NAV-08** — every `Note` field with `NAV-08 →` is its mapping input. The namespace rewrite uses this as the source of truth.
- **NAV-10** — read the `delete` rows. (Done.)
- **NAV-11** — read the `defer` rows. Reopen when WV-12 lands.
- **NAV-13** — every row gets a `<ModeRoute mode="…">` wrapper using the first column of its section as the `mode` value.
- **WV-13 / WV-14** — read the `self-app` rows for the wiring backlog.
