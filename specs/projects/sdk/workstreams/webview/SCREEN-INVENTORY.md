# Webview Migration — Screen Inventory

Master list of 3.0 production-scope screens grouped by flow, for migrating euclid to the webview app (`selfxyz/self/packages/webview-app`).

Scope notes:

- Summary totals count **Euclid source screens** from `@selfxyz/euclid`, not webview wrapper files.
- Webview-only production screens are tracked separately and are **not** included in the Euclid totals.
- Tunnel/demo screens are listed for context but are **not** counted in 3.0 production totals.

Last updated: 2026-03-24

---

## Current Webview App State

### Already Implemented (PR #1858 + prior work)

These screens already exist in `selfxyz/self/packages/webview-app/src/screens/`.

**Euclid screen migrations** (10 webview wrappers covering 11 euclid source screens):

| Webview Screen                  | Euclid Source                               | Folder        |
| ------------------------------- | ------------------------------------------- | ------------- |
| `HomeScreen`                    | `HomeScreen`                                | `home/`       |
| `SettingsScreen`                | `SettingsViewScreen`                        | `account/`    |
| `SecurityScreen`                | `SecurityScreen`                            | `account/`    |
| `NotificationPreferencesScreen` | `NotificationPreferencesScreen`             | `account/`    |
| `DevModeScreen`                 | `DevModeScreen`                             | `account/`    |
| `CountryPickerScreen`           | `CountryPickerScreen`                       | `onboarding/` |
| `IDSelectionScreen`             | `IDTypeScreen`                              | `onboarding/` |
| `ProvingScreen`                 | `ProofProgressScreen`                       | `proving/`    |
| `VerificationResultScreen`      | `ProofSuccessScreen` / `ProofFailureScreen` | `proving/`    |
| `ComingSoonScreen`              | `ComingSoonScreen`                          | (root)        |

**Webview-only production screens** (3 screens — no euclid equivalent, created for the webview app):

| Webview Screen                | Purpose                                                                    | Folder        |
| ----------------------------- | -------------------------------------------------------------------------- | ------------- |
| `ConfirmIdentificationScreen` | Confirm ID details before provider handoff                                 | `onboarding/` |
| `ProviderLaunchScreen`        | Provider placeholder (replaces native camera/NFC screens removed in WV-03) | `onboarding/` |
| `ProviderResultScreen`        | Provider result handoff and routing after Sumsub / KYC completion          | `onboarding/` |

**Tunnel flow screens** (PoC / demo flow from PR #1858 — not 3.0 production scope):

- `TourScreen`, `TunnelCountryPickerScreen`, `TunnelIDTypeScreen`, `KycMockScreen`, `TunnelProvingScreen`, `TunnelProofReceiptScreen`, `TunnelResultScreen`

The tunnel route wrapper `TourScreen` renders the real Euclid `LaunchTour1Screen`–`LaunchTour4Screen` sequence for demo wiring. It does not mean the full registration flow is migrated end-to-end.

### Completed Specs (WV-01 through WV-04)

| ID    | Title                          | Status |
| ----- | ------------------------------ | ------ |
| WV-01 | Dynamic proof request items    | Done   |
| WV-02 | KYC provider contract          | Done   |
| WV-03 | Remove native scan assumptions | Done   |
| WV-04 | Host callback contract         | Done   |

### Open Linear Issues (from PR #1858 audit)

| Issue     | Title                                                  | Priority |
| --------- | ------------------------------------------------------ | -------- |
| SELF-2357 | Euclid migration: validate exports + API compatibility | Urgent   |
| SELF-2358 | Sumsub / WV-05 contract compliance                     | High     |
| SELF-2359 | Tunnel + proving flow data propagation fixes           | High     |
| SELF-2360 | Settings persistence, test coverage, doc cleanup       | Medium   |

Note: SELF-2358 references WV-05 contract compliance. WV-05 is now documented in `plans/WV-05-sumsub-web-sdk.md`; keep issue execution aligned with that spec.

---

## Remaining Work — Grouped by Flow

### Priority 1: Registration Flow

#### Tour (4 screens) — NOT YET MIGRATED

| Screen              | Key Components                                 | Purpose                                 | Status |
| ------------------- | ---------------------------------------------- | --------------------------------------- | ------ |
| `LaunchTour1Screen` | ProgressBar, LottieAnimation, SelfLogo, Button | Step 1/4 — centered dialogue with logo  | Todo   |
| `LaunchTour2Screen` | ProgressBar, LottieAnimation, Button           | Step 2/4 — bottom-aligned with gradient | Todo   |
| `LaunchTour3Screen` | ProgressBar, LottieAnimation, Button           | Step 3/4 — bottom-aligned               | Todo   |
| `LaunchTour4Screen` | ProgressBar, LottieAnimation, Button           | Step 4/4 — CTA + Terms/Privacy          | Todo   |

Note: `@selfxyz/euclid` currently exports both the 4-step `LaunchTour1Screen`–`LaunchTour4Screen` sequence and a separate legacy `TourScreen`. This inventory treats the 4-step launch tour as the 3.0 production scope. The legacy `TourScreen` is not counted in the totals below.

#### Country & ID Type Selection — ALREADY MIGRATED

`CountryPickerScreen`, `IDTypeScreen` (as `IDSelectionScreen`), `ComingSoonScreen` are done.

#### EU ID Screens (6 screens) — DEFERRED TO 3.1 / NOT IN INITIAL WEBVIEW RELEASE

| Screen                       | Key Components                         | Purpose                                 | Status |
| ---------------------------- | -------------------------------------- | --------------------------------------- | ------ |
| `EuIdInstructionsScreen`     | InstructionFlowScaffold                | Step 3/7 — front side scan instructions | Todo   |
| `EuIdBackInstructionsScreen` | InstructionFlowScaffold                | Step 4/7 — back side scan instructions  | Todo   |
| `EuIdViewfinderScreen`       | InstructionFlowScaffold + camera frame | Step 5/7 — camera viewfinder            | Todo   |
| `EuIdCanInstructionsScreen`  | InstructionFlowScaffold                | CAN entry instructions                  | Todo   |
| `EuIdNfcInstructionsScreen`  | InstructionFlowScaffold                | Step 6/7 — NFC chip scan instructions   | Todo   |
| `EuIdNfcSuccessScreen`       | Success UI                             | Step 7/7 — NFC read confirmation        | Todo   |

Note: Camera/NFC native screens were removed in WV-03. These six screens are not part of the provider-backed registration flow and are not part of the initial webview release. Providers own their own onboarding/capture guidance. Keep these screens inventoried only; they are deferred to mobile app 3.1 unless a separate Self-owned EU ID flow is approved in a future spec.

#### Registration Outcome (3 screens) — NOT YET MIGRATED

| Screen                      | Key Components   | Purpose                     | Status |
| --------------------------- | ---------------- | --------------------------- | ------ |
| `ScanSuccessScreen`         | Success UI       | Document scan succeeded     | Todo   |
| `RegistrationFailureScreen` | Error UI, Button | Registration failed — retry | Todo   |
| `SumsubFailureScreen`       | Error UI         | Sumsub verification failed  | Todo   |

Note: `SumsubFailureScreen` migration may overlap with SELF-2358 (Sumsub / WV-05 contract compliance). Coordinate with that issue to avoid duplicate work.

#### Social Sign-On / Onboarding (4 screens) — NOT YET MIGRATED

| Screen                           | Key Components          | Purpose                                  | Status |
| -------------------------------- | ----------------------- | ---------------------------------------- | ------ |
| `SocialSignOnMethodPickerScreen` | LottieAnimation, Button | Choose backup method (Apple/Google/Seed) | Todo   |
| `SocialSignOnPickerScreen`       | Button                  | Simplified social sign-on picker         | Todo   |
| `ConflictDetectedScreen`         | Button, hero image      | Account conflict resolution              | Todo   |
| `PushNotificationPromptScreen`   | LottieAnimation, Button | Enable push notifications                | Todo   |

**Registration remaining: 17 screens**

---

### Priority 2: Disclose Flow (Proof Generation)

#### Core Proof Flow — PARTIALLY MIGRATED

`ProvingScreen` (covers `ProofProgressScreen`) and `VerificationResultScreen` (covers success/failure) already exist.

| Screen                      | Key Components                                | Purpose                                        | Status |
| --------------------------- | --------------------------------------------- | ---------------------------------------------- | ------ |
| `QRViewfinderScreen`        | Camera frame, scanner overlay                 | Scan QR code to start proof                    | Todo   |
| `ProofRequestScreen`        | TopNavigation, ProofRequest, IDPicker, Button | Review request, select doc, long-press confirm | Todo   |
| `ProofGenerationScreen`     | IDCard, LottieAnimation, ProofGeneration      | ID card + generation animation                 | Todo   |
| `ProofResultScreen`         | Proof result display                          | Final proof details                            | Todo   |
| `ProofRequestReceiptScreen` | Receipt UI                                    | Accepted request receipt                       | Todo   |
| `ProofHistoryScreen`        | TopNavigation, DetailedTableView              | Chronological list of proofs                   | Todo   |

#### Proof Dialogues (5 screens) — NOT YET MIGRATED

| Screen                          | Key Components                  | Purpose                            | Status |
| ------------------------------- | ------------------------------- | ---------------------------------- | ------ |
| `SimpleDialogueScreen`          | Dialogue, TopNavigationDialogue | Text-only message overlay          | Todo   |
| `DialogueWithCtaScreen`         | Dialogue, Button                | Message with action buttons        | Todo   |
| `ProofGenerationDialogueScreen` | Dialogue, ProofGeneration       | Progress overlay during generation | Todo   |
| `ProofGenerationSuccessScreen`  | Success animation               | Generation success confirmation    | Todo   |
| `ProofSuccessBackupScreen`      | Success UI, Button              | Post-proof backup prompt           | Todo   |

#### Sumsub Verification (2 screens) — NOT YET MIGRATED

| Screen                            | Key Components | Purpose                         | Status |
| --------------------------------- | -------------- | ------------------------------- | ------ |
| `SumsubPendingScreen`             | Loading UI     | Waiting for Sumsub verification | Todo   |
| `SumsubVerificationSuccessScreen` | Success UI     | Sumsub verification passed      | Todo   |

Related: SELF-2358 covers Sumsub contract compliance.

#### Other (1 screen)

| Screen             | Key Components | Purpose             | Status |
| ------------------ | -------------- | ------------------- | ------ |
| `NovaSplashScreen` | Splash UI      | Nova feature splash | Todo   |

**Disclose remaining: 14 screens**

---

### Priority 3: Home + ID Data — PARTIALLY MIGRATED

`HomeScreen` is done.

| Screen         | Key Components                                          | Purpose                   | Status |
| -------------- | ------------------------------------------------------- | ------------------------- | ------ |
| `IDDataScreen` | TopNavigationDialogue, ExposedIDCard, DetailedTableView | View extracted ID details | Todo   |

---

### Priority 4: Recovery & Backup Flow (5 screens) — NOT YET MIGRATED

| Screen                     | Key Components                                            | Purpose                          | Status |
| -------------------------- | --------------------------------------------------------- | -------------------------------- | ------ |
| `LaunchRecoveryScreen`     | SocialSignOnButton, Button                                | Recovery landing — choose method | Todo   |
| `SecretPhraseInputScreen`  | TopNavigationDialogue, SecretPhraseInput, Button          | Enter 24-word phrase             | Todo   |
| `RecoverySuccessScreen`    | Success UI                                                | Recovery succeeded               | Todo   |
| `BackupMethodPickerScreen` | TopNavigationDialogue                                     | Choose backup method             | Todo   |
| `RecoveryPhraseScreen`     | TopNavigationDialogue, RecoveryPhrase, SocialSignOnButton | View/reveal recovery phrase      | Todo   |

---

### Priority 5: Settings — MOSTLY MIGRATED

`SettingsScreen`, `SecurityScreen`, `NotificationPreferencesScreen`, `DevModeScreen` are done.

| Screen                  | Key Components                           | Purpose               | Status |
| ----------------------- | ---------------------------------------- | --------------------- | ------ |
| `ManageDocumentsScreen` | DetailedTableView, DetailedTableViewCell | Manage registered IDs | Todo   |

---

## Deprioritized (3.1 / Skip)

| Flow                                  | Screens                                                                                                                                                                                       | Reason                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Passport Registration** (6 screens) | `PassportInstructionsScreen`, `PassportCodeScanInstructionsScreen`, `PassportCodeScanViewfinderScreen`, `PassportNfcInstructionsScreen`, `PassportNfcErrorScreen`, `PassportNfcSuccessScreen` | Deferred to 3.1 (SELF-2145) |
| **Aadhaar Registration** (3 screens)  | `AadhaarAppInstructionsScreen`, `AadhaarUploadSuccessScreen`, `AadhaarUploadErrorScreen`                                                                                                      | Deferred to 3.1 (SELF-2235) |
| **EU ID Registration** (6 screens)    | `EuIdInstructionsScreen`, `EuIdBackInstructionsScreen`, `EuIdViewfinderScreen`, `EuIdCanInstructionsScreen`, `EuIdNfcInstructionsScreen`, `EuIdNfcSuccessScreen`                           | Deferred to 3.1 (`WV-10`)   |
| **Points** (2 screens)                | `PointsScreen`, `InviteScreen`                                                                                                                                                                | Deferred to 3.1 (SELF-2249) |

---

## Summary

| Category                     | Total Screens | Already Done | Remaining |
| ---------------------------- | ------------- | ------------ | --------- |
| Registration: Tour           | 4             | 0            | 4         |
| Registration: Country/ID     | 3             | 3            | 0         |
| Registration: EU ID Scan     | 6             | 0            | 6\*\*     |
| Registration: Outcome        | 3             | 0            | 3         |
| Registration: Social Sign-On | 4             | 0            | 4         |
| Disclose: Core Proof         | 9             | 3\*          | 6         |
| Disclose: Proof Dialogues    | 5             | 0            | 5         |
| Disclose: Sumsub             | 2             | 0            | 2         |
| Disclose: Other              | 1             | 0            | 1         |
| Home + ID Data               | 2             | 1            | 1         |
| Recovery & Backup            | 5             | 0            | 5         |
| Settings                     | 5             | 4            | 1         |
| **Total (3.0 scope)**        | **43**        | **11**       | **32**    |

"Already Done" counts Euclid source-screen coverage, not wrapper file count. The webview app currently has 10 Euclid-backed wrapper screens plus 3 webview-only production screens (`ConfirmIdentificationScreen`, `ProviderLaunchScreen`, `ProviderResultScreen`), which are not included in the totals above.

\*`ProvingScreen` covers `ProofProgressScreen`. `VerificationResultScreen` covers both `ProofSuccessScreen` and `ProofFailureScreen`, so this row has 3 Euclid source screens already covered.

Counting basis for the 43-screen total:

- `@selfxyz/euclid` v1.2.0 currently exports 61 screen components.
- 17 screens are explicitly deprioritized for 3.1 (`Passport*`, `Aadhaar*`, `EuId*`, `Points*`).
- 1 legacy marketing screen (`TourScreen`) is excluded from 3.0 tracking because the current scope uses `LaunchTour1Screen`–`LaunchTour4Screen` instead.

---

## Coverage Status

All current `@selfxyz/euclid` screen components are accounted for in one of these buckets:

- **Done in webview app**: 11 Euclid source screens are already covered by current webview wrappers
- **Remaining in 3.0 scope**: 32 Euclid source screens remain planned for migration
- **Deferred to 3.1**: 17 Euclid source screens are intentionally deprioritized
- **Excluded from 3.0 count**: 1 legacy Euclid screen (`TourScreen`) is tracked as out of active 3.0 scope because the launch-tour sequence uses `LaunchTour1Screen`–`LaunchTour4Screen`

That means every current Euclid screen is accounted for in the inventory.

Flow-level status is slightly different:

- All screen families are accounted for
- A small number of flow decisions still need explicit product/spec confirmation before ticket creation

Resolved flow decisions:

- EU ID helper screens are deferred from the active webview migration (WV-10); not part of provider-backed registration or the initial webview release, and currently targeted no earlier than mobile app 3.1
- Main `/proving` route is the core disclose path (WV-11); tunnel stays as the reference/demo flow from WV-08

Open flow decisions:

- whether `ConfirmIdentificationScreen` remains a separate registration step
- whether `SumsubPendingScreen` and `SumsubVerificationSuccessScreen` are end-user product screens or support-state screens
