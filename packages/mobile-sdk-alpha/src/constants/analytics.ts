// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Aadhaar branch milestone events. Curated from 25 → 7 in ANA-12. Diagnostic
 * events from the legacy set were either deleted (ANA-12) or migrated to
 * Sentry breadcrumbs (ANA-13). Emit via `trackBranchEvent`.
 */
export const AadhaarEvents = {
  CONTINUE_PRESSED: 'Aadhaar: Continue Pressed',
  DATA_STORED: 'Aadhaar: Data Stored',
  PHOTO_PERMISSION_DENIED: 'Aadhaar: Photo Permission Denied',
  QR_PARSE_FAILED: 'Aadhaar: QR Parse Failed',
  QR_SELECTED: 'Aadhaar: QR Selected',
  TIMESTAMP_EXPIRED: 'Aadhaar: Timestamp Expired',
  UPLOAD_STARTED: 'Aadhaar: Upload Started',
};

export const AppEvents = {
  DISMISS_PRIVACY_DISCLAIMER: 'App: Dismiss Privacy Disclaimer',
  GET_STARTED: 'App: Get Started',
  GET_STARTED_AADHAAR: 'App: Get Started - Aadhaar',
  GET_STARTED_BIOMETRIC: 'App: Get Started - Biometric ID',
  SUPPORTED_BIOMETRIC_IDS: 'App: Supported Biometric IDs',
  UPDATE_MODAL_CLOSED: 'App: Update Modal Closed',
  UPDATE_MODAL_OPENED: 'App: Update Modal Opened',
  UPDATE_STARTED: 'App: Update Started',
};

/**
 * Login funnel events. Curated from 12 → 3 in ANA-13. The deleted keys
 * (BIOMETRIC_AUTH_*, BIOMETRIC_CHECK, BIOMETRIC_LOGIN_ATTEMPT, MNEMONIC_*,
 * AUTHENTICATION_TIMEOUT) were diagnostic and now flow through Sentry
 * breadcrumbs / captured exceptions. The three remaining keys are the
 * mutually-exclusive terminal states of a biometric login attempt.
 */
export const AuthEvents = {
  BIOMETRIC_LOGIN_CANCELLED: 'Auth: Biometric Login Cancelled',
  BIOMETRIC_LOGIN_FAILED: 'Auth: Biometric Login Failed',
  BIOMETRIC_LOGIN_SUCCESS: 'Auth: Biometric Login Success',
};

export const BackupEvents = {
  ACCOUNT_RECOVERY_COMPLETED: 'Backup: Account Recovery Completed',
  ACCOUNT_RECOVERY_STARTED: 'Backup: Account Recovery Started',
  ACCOUNT_VERIFICATION_COMPLETED: 'Backup: Account Verification Completed',
  CLOUD_BACKUP_CANCELLED: 'Backup: Cloud Backup Cancelled',
  CLOUD_BACKUP_CONTINUE: 'Backup: Cloud Backup Continue',
  CLOUD_BACKUP_DISABLED_DONE: 'Backup: Cloud Backup Disabled Done',
  CLOUD_BACKUP_DISABLE_STARTED: 'Backup: Cloud Backup Disable Started',
  CLOUD_BACKUP_ENABLED_DONE: 'Backup: Cloud Backup Enabled Done',
  CLOUD_BACKUP_ENABLE_STARTED: 'Backup: Cloud Backup Enable Started',
  CLOUD_BACKUP_STARTED: 'Backup: Cloud Backup Started',
  CLOUD_RESTORE_FAILED_AUTH: 'Backup: Cloud Restore Failed: Authentication Failed',
  CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED: 'Backup: Cloud Restore Failed: Passport Not Registered',
  CLOUD_RESTORE_FAILED_UNKNOWN: 'Backup: Cloud Restore Failed: Unknown Error',
  CLOUD_RESTORE_SUCCESS: 'Backup: Cloud Restore Success',
  TURNKEY_RESTORE_FAILED: 'Backup: Turnkey Restore Failed',
  CREATE_NEW_ACCOUNT: 'Backup: Create New Account',
  MANUAL_RECOVERY_SELECTED: 'Backup: Manual Recovery Selected',
};

/**
 * Biometric branch events. Covers passport AND biometric ID — same code
 * path, distinguished by a `document_type` property. Curated to 6 milestone
 * keys in ANA-12; the legacy `Passport:`-prefixed diagnostic keys were
 * migrated to Sentry breadcrumbs in ANA-13.
 *
 * NFC_SCAN_FAILED / NFC_RESPONSE_PARSE_FAILED stay as constants because the
 * native NFC channel (`trackNfcEvent`) still emits them via the
 * `PassportReader` Mixpanel pipe — that pipe is out of scope for ANA-13.
 *
 * Emit milestone keys via `trackBranchEvent`; native NFC pipe uses
 * `trackNfcEvent`.
 */
export const BiometricEvents = {
  DOCUMENT_PARSED: 'Biometric: Document Parsed',
  DOCUMENT_UNSUPPORTED: 'Biometric: Document Unsupported',
  MRZ_CAPTURED: 'Biometric: MRZ Captured',
  MRZ_CAPTURE_STARTED: 'Biometric: MRZ Capture Started',
  NFC_STARTED: 'Biometric: NFC Started',
  NFC_SUCCEEDED: 'Biometric: NFC Succeeded',

  // Native NFC pipe constants — emitted only via `trackNfcEvent`, not
  // `trackEvent`. Names retain the legacy `Passport:` prefix to preserve
  // Mixpanel data continuity in the native NFC project.
  NFC_RESPONSE_PARSE_FAILED: 'Passport: Parsing NFC Response Unsuccessful',
  NFC_SCAN_FAILED: 'Passport: NFC Scan Failed',
};

export const DocumentEvents = {
  COUNTRY_HELP_TAPPED: 'Document: Country Help Tapped',
  ADD_NEW_AADHAAR_SELECTED: 'Document: Add Aadhaar',
  ADD_NEW_MOCK_SELECTED: 'Document: Add New Document via Mock',
  ADD_NEW_SCAN_SELECTED: 'Document: Add New Document via Scan',
  DOCUMENT_DELETED: 'Document: Document Deleted',
  DOCUMENT_SELECTED: 'Document: Document Selected',
  DOCUMENT_VALIDATED: 'Document: Document Validated',
  DOCUMENTS_FETCHED: 'Document: Documents Fetched',
  MANAGE_SCREEN_OPENED: 'Document: Manage Documents Screen Opened',
  NO_DOCUMENTS_FOUND: 'Document: No Documents Found',
  PASSPORT_INFO_OPENED: 'Document: Passport Info Screen Opened',
  PASSPORT_METADATA_LOADED: 'Document: Passport Metadata Loaded',
  VALIDATE_DOCUMENT_FAILED: 'Document: Validate Document Failed',
};

/**
 * KYC branch milestone events. Provider-tagged from day one (`provider: 'didit'`)
 * so adding Veriff/Sumsub later doesn't require renaming events. Emit via
 * `trackBranchEvent`.
 */
export const KycEvents = {
  PROVIDER_CLOSED: 'Kyc: Provider Closed',
  PROVIDER_OPENED: 'Kyc: Provider Opened',
  RETRY_TRIGGERED: 'Kyc: Retry Triggered',
  SESSION_CREATED: 'Kyc: Session Created',
  SESSION_REQUESTED: 'Kyc: Session Requested',
};

export const NotificationEvents = {
  BACKGROUND_NOTIFICATION_OPENED: 'Notification: Background Notification Opened',
  COLD_START_NOTIFICATION_OPENED: 'Notification: Cold Start Notification Opened',
};

/**
 * Canonical onboarding funnel events. These are the ONLY events the Mixpanel
 * onboarding funnel consumes. They fire at most once per onboarding attempt,
 * guarded by the canonical funnel helper — never on component mount, never on
 * back-navigation. Every other `*Events` group in this file is a sibling
 * surface (branch, login, app lifecycle), excluded from the funnel.
 */
export const OnboardingEvents = {
  STARTED: 'Onboarding: Started',
  COUNTRY_SELECTED: 'Onboarding: Country Selected',
  DOCUMENT_TYPE_SELECTED: 'Onboarding: Document Type Selected',
  SCAN_STARTED: 'Onboarding: Document Scan Started',
  SCAN_SUCCEEDED: 'Onboarding: Document Scan Succeeded',
  PROOF_STARTED: 'Onboarding: Proof Generation Started',
  PROOF_SUCCEEDED: 'Onboarding: Proof Generation Succeeded',
  COMPLETED: 'Onboarding: Completed',
  FAILED: 'Onboarding: Failed',
  STEP_RETRIED: 'Onboarding: Step Retried',
};

/**
 * @deprecated Use `BiometricEvents` directly. Kept as an alias for the
 * native-NFC-channel call sites that still reference the historic name.
 */
export const PassportEvents = BiometricEvents;

export const PointEvents = {
  HOME_POINT_EARN_POINTS_OPENED: 'Points: Home Earn Points Opened',
  EXPLORE_APPS: 'Points: Explore Apps Opened',
  EARN_REFERRAL: 'Points: Earn Referral Opened',
  EARN_REFERRAL_MESSAGES: 'Points: Earn Referral via Messages',
  EARN_REFERRAL_WHATSAPP: 'Points: Earn Referral via WhatsApp',
  EARN_REFERRAL_SHARE: 'Points: Earn Referral via Share',
  EARN_REFERRAL_COPY_LINK: 'Points: Earn Referral Copy Link',
  EARN_BACKUP: 'Points: Earn with Backup',
  EARN_BACKUP_SUCCESS: 'Points: Earn with Backup Success',
  EARN_BACKUP_FAILED: 'Points: Earn with Backup Failed',
  EARN_NOTIFICATION: 'Points: Earn with Notification',
  EARN_NOTIFICATION_FAILED: 'Points: Earn with Notification Failed',
  EARN_NOTIFICATION_SUCCESS: 'Points: Earn with Notification Success',
  REFRESH_HISTORY: 'Points: Refresh History',
};

/**
 * Native-NFC-channel constants only. The Mixpanel `trackEvent` pipe no longer
 * emits any `Proof:`-prefixed events as of ANA-13 — those are now Sentry
 * breadcrumbs. `PROVING_PROCESS_ERROR` survives because it is emitted via
 * `trackNfcEvent`, which still ships to the native NFC Mixpanel project
 * (out of scope for ANA-13; see ANA-04).
 */
export const ProofEvents = {
  PROVING_PROCESS_ERROR: 'Proof: Proving Process Error',
};
