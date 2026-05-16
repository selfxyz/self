// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Aadhaar branch milestone events. Curated from 25 → 7 in ANA-12. The deleted
 * events (UPLOAD_SCREEN_OPENED, PROCESSING_STARTED, QR_DATA_EXTRACTION_*, etc.)
 * become Sentry breadcrumbs in ANA-13. Emit via `trackBranchEvent`.
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

export const AuthEvents = {
  AUTHENTICATION_TIMEOUT: 'Auth: Authentication Timeout',
  BIOMETRIC_AUTH_FAILED: 'Auth: Biometric Auth Failed',
  BIOMETRIC_AUTH_SUCCESS: 'Auth: Biometric Auth Success',
  BIOMETRIC_CHECK: 'Auth: Biometrics Check',
  BIOMETRIC_LOGIN_ATTEMPT: 'Auth: Biometric Login Attempt',
  BIOMETRIC_LOGIN_CANCELLED: 'Auth: Biometric Login Cancelled',
  BIOMETRIC_LOGIN_FAILED: 'Auth: Biometric Login Failed',
  BIOMETRIC_LOGIN_SUCCESS: 'Auth: Biometric Login Success',
  MNEMONIC_CREATED: 'Auth: Mnemonic Created',
  MNEMONIC_LOADED: 'Auth: Mnemonic Loaded',
  MNEMONIC_RESTORE_FAILED: 'Auth: Mnemonic Restore Failed',
  MNEMONIC_RESTORE_SUCCESS: 'Auth: Mnemonic Restore Success',
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
 * Biometric branch events. Covers passport AND biometric ID — the same code
 * path serves both, distinguished by a `document_type` property on each event.
 *
 * The MRZ_*, NFC_*, DOCUMENT_* keys at the top are the canonical milestone
 * events introduced in ANA-12; emit them via `trackBranchEvent`.
 *
 * The remaining keys are diagnostic events retained from the legacy
 * `PassportEvents` group. Their string values keep the `Passport:` prefix
 * deliberately, to preserve Mixpanel data continuity until ANA-13 migrates
 * them off Mixpanel and onto Sentry breadcrumbs.
 */
export const BiometricEvents = {
  // ANA-12 milestone events (emit via trackBranchEvent)
  DOCUMENT_PARSED: 'Biometric: Document Parsed',
  DOCUMENT_UNSUPPORTED: 'Biometric: Document Unsupported',
  MRZ_CAPTURED: 'Biometric: MRZ Captured',
  MRZ_CAPTURE_STARTED: 'Biometric: MRZ Capture Started',
  NFC_STARTED: 'Biometric: NFC Started',
  NFC_SUCCEEDED: 'Biometric: NFC Succeeded',

  // Diagnostic events — slated for Sentry migration in ANA-13.
  CAMERA_SCAN_CANCELLED: 'Passport: Camera Scan Cancelled',
  CAMERA_SCAN_FAILED: 'Passport: Camera Scan Failed',
  CAMERA_SCAN_STARTED: 'Passport: Camera Scan Started',
  CAMERA_SCAN_SUCCESS: 'Passport: Camera Scan Success',
  CAMERA_SCREEN_CLOSED: 'Passport: Camera View Closed',
  CANCEL_PASSPORT_NFC: 'Passport: Cancel Passport NFC',
  COMING_SOON: 'Passport: Passport Not Supported',
  DATA_CONFIRMATION_COMPLETED: 'Passport: Data Confirmation Completed',
  DATA_LOAD_ERROR: 'Passport: Passport Data Load Error',
  DISMISS_COMING_SOON: 'Passport: Dismiss Unsupported Passport',
  MRZ_DATA_MODIFIED: 'Passport: MRZ Data Modified',
  NFC_RESPONSE_PARSE_FAILED: 'Passport: Parsing NFC Response Unsuccessful',
  NFC_SCAN_FAILED: 'Passport: NFC Scan Failed',
  NFC_SCAN_SUCCESS: 'Passport: NFC Scan Success',
  NOTIFY_COMING_SOON: 'Passport: Notify Unsupported Passport',
  OPEN_NFC_SETTINGS: 'Passport: Open NFC Settings',
  OWNERSHIP_CONFIRMED: 'Passport: Passport Ownership Confirmed',
  PASSPORT_DATA_NOT_FOUND: 'Passport: Passport Data Not Found',
  PASSPORT_PARSE_FAILED: 'Passport: Passport Parse Failed',
  PASSPORT_PARSED: 'Passport: Passport Parsed',
  START_PASSPORT_NFC: 'Passport: Start Passport NFC',
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

export const IDDataEvents = {
  PERKS_VIEWED: 'ID Data: Perks Viewed',
  PERK_TAPPED: 'ID Data: Perk Tapped',
  PERK_OUTLINK_OPEN_FAILED: 'ID Data: Perk Outlink Open Failed',
};

export const MockDataEvents = {
  CANCEL_GENERATION: 'Mock Data: Cancel Generation',
  CREATE_DEEP_LINK: 'Mock Data: Create Deep Link',
  DECREASE_AGE: 'Mock Data: Decrease Age',
  DECREASE_EXPIRY_YEARS: 'Mock Data: Decrease Expiry Years',
  ENABLE_ADVANCED_MODE: 'Mock Data: Enable Advanced Mode',
  GENERATE_DATA: 'Mock Data: Generate Data',
  INCREASE_AGE: 'Mock Data: Increase Age',
  INCREASE_EXPIRY_YEARS: 'Mock Data: Increase Expiry Years',
  OPEN_ALGORITHM_SELECTION: 'Mock Data: Open Algorithm Selection',
  OPEN_COUNTRY_SELECTION: 'Mock Data: Open Country Selection',
  SELECT_ALGORITHM: 'Mock Data: Select Algorithm',
  SELECT_COUNTRY: 'Mock Data: Select Country',
  SELECT_DOCUMENT_TYPE: 'Mock Data: Select Document Type',
  TOGGLE_OFAC_LIST: 'Mock Data: Toggle OFAC List',
};

export const NotificationEvents = {
  BACKGROUND_NOTIFICATION_OPENED: 'Notification: Background Notification Opened',
  COLD_START_NOTIFICATION_OPENED: 'Notification: Cold Start Notification Opened',
};

/**
 * Canonical onboarding funnel events. These are the ONLY events the Mixpanel
 * onboarding funnel consumes. They fire at most once per onboarding attempt,
 * guarded by the canonical funnel helper — never on component mount, never on
 * back-navigation. Every other `*Events` group in this file is the diagnostic
 * layer and is excluded from the funnel.
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
 * @deprecated Renamed to `BiometricEvents` in ANA-12 — the same code path
 * covers passports and biometric IDs, distinguished by a `document_type`
 * property. This alias keeps existing call sites compiling for one release
 * and is removed in the next minor.
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

export const ProofEvents = {
  ALREADY_REGISTERED: 'Proof: Already Registered',
  ATTESTATION_RECEIVED: 'Proof: Attestation Received',
  ATTESTATION_VERIFIED: 'Proof: Attestation Verified',
  CLEANUP_COMPLETED: 'Proof: Connections Cleanup Completed',
  CLEANUP_STARTED: 'Proof: Connections Cleanup Started',
  CONNECTION_UUID_GENERATED: 'Proof: Connection UUID Generated',
  DEVICE_TOKEN_REG_FAILED: 'Proof: Device Token Registration Failed',
  DEVICE_TOKEN_REG_STARTED: 'Proof: Device Token Registration Started',
  DEVICE_TOKEN_REG_SUCCESS: 'Proof: Device Token Registration Succeeded',
  DOCUMENT_LOAD_STARTED: 'Proof: Load Selected Document Started',
  DSC_IN_TREE: 'Proof: DSC Already In Tree',
  FCM_TOKEN_STORED: 'Proof: FCM Token Stored Successfully',
  FETCH_DATA_FAILED: 'Proof: Fetch Data Failed',
  FETCH_DATA_STARTED: 'Proof: Fetch Data Started',
  FETCH_DATA_SUCCESS: 'Proof: Fetch Data Succeeded',
  GOOGLE_USAT_BLOCK_DISMISSED: 'Proof: Google USAT Disclosure Block Dismissed',
  GOOGLE_USAT_BLOCKED: 'Proof: Google USAT Disclosure Blocked',
  GOOGLE_USAT_RECOVER_CLICKED: 'Proof: Google USAT Disclosure Recover Clicked',
  LOAD_SECRET_FAILED: 'Proof: Load Secret Failed',
  PARSE_ID_DOCUMENT_STARTED: 'Proof: Parse ID Document Started',
  NOTIFICATION_PERMISSION_REQUESTED: 'Proof: Notification Permission Requested',
  PASSPORT_NULLIFIER_ONCHAIN: 'Proof: Passport Nullifier Onchain',
  PAYLOAD_ENCRYPTED: 'Proof: Payload Encrypted',
  PAYLOAD_GEN_COMPLETED: 'Proof: Payload Generation Completed',
  PAYLOAD_GEN_STARTED: 'Proof: Payload Generation Started',
  PAYLOAD_SENT: 'Proof: Payload Sent',
  POST_PROVING_CHAIN_STEP: 'Proof: Post Proving Chain Step',
  POST_PROVING_COMPLETED: 'Proof: Post Proving Completed',
  POST_PROVING_STARTED: 'Proof: Post Proving Started',
  PROOF_COMPLETED: 'Proof: Proof Completed',
  PROOF_DISCLOSURES_SCROLLED: 'Proof: Proof Disclosures Scrolled',
  PROOF_FAILED: 'Proof: Proof Failed',
  POINTS_NULLIFIER_ALREADY_USED: 'Proof: Points Nullifier Already Used',
  PROOF_RESULT_ACKNOWLEDGED: 'Proof: Proof Result Acknowledged',
  PROOF_VERIFY_CONFIRMATION_ACCEPTED: 'Proof: Verify Confirmation Accepted',
  PROOF_VERIFY_LONG_PRESS: 'Proof: Verify Button Long Pressed',
  PROVING_INIT: 'Proof: Proving Machine Init',
  PROVING_PROCESS_ERROR: 'Proof: Proving Process Error',
  PROVING_PROCESS_STARTED: 'Proof: Proving Process Started',
  PROVING_STATE_CHANGE: 'Proof: Proving State Change',
  QR_SCAN_CANCELLED: 'Proof: QR Scan Cancelled',
  QR_SCAN_FAILED: 'Proof: QR Scan Failed',
  QR_SCAN_REQUESTED: 'Proof: QR Scan Requested',
  QR_SCAN_SUCCESS: 'Proof: QR Scan Success',
  REGISTER_COMPLETED: 'Proof: Register Completed',
  SHARED_KEY_DERIVED: 'Proof: Shared Key Derived',
  SOCKETIO_CONNECT_ERROR: 'Proof: Socket.IO Connect Error',
  SOCKETIO_CONN_STARTED: 'Proof: Socket.IO Connection Started',
  SOCKETIO_DISCONNECT_UNEXPECTED: 'Proof: Socket.IO Disconnected Unexpectedly',
  SOCKETIO_PROOF_FAILURE: 'Proof: Socket.IO Proof Failure',
  SOCKETIO_PROOF_SUCCESS: 'Proof: Socket.IO Proof Success',
  SOCKETIO_STATUS_RECEIVED: 'Proof: Socket.IO Status Received',
  SOCKETIO_SUBSCRIBED: 'Proof: Socket.IO Subscribed',
  TEE_CONN_FAILED: 'Proof: TEE Connection Failed',
  TEE_CONN_STARTED: 'Proof: TEE Connection Started',
  TEE_CONN_SUCCESS: 'Proof: TEE Connection Succeeded',
  TEE_WS_CLOSED: 'Proof: TEE WS Closed',
  TEE_WS_ERROR: 'Proof: TEE WS Error',
  USER_CONFIRMED: 'Proof: User Confirmed',
  VALIDATION_FAILED: 'Proof: Validation Failed',
  VALIDATION_STARTED: 'Proof: Validation Started',
  VALIDATION_SUCCESS: 'Proof: Validation Succeeded',
  WS_HELLO_ACK: 'Proof: WS Hello Acknowledged',
  WS_HELLO_SENT: 'Proof: WS Hello Sent',
};

// Diagnostic events for the registration ID-type picker (SELF-2860). Names are
// the literal Mixpanel event strings from the ticket — they intentionally use
// snake_case rather than the 'Group: Event' convention used elsewhere.
export const RegistrationPickerEvents = {
  VIEWED: 'registration_id_picker_viewed',
  SELECTED: 'registration_id_picker_selected',
  UNSUPPORTED_TAPPED: 'registration_id_picker_unsupported_tapped',
};

export const SettingsEvents = {
  CONNECTION_MODAL_CLOSED: 'Settings: Connection Modal Closed',
  CONNECTION_MODAL_OPENED: 'Settings: Connection Modal Opened',
  CONNECTION_SETTINGS_OPENED: 'Settings: Connection Settings Opened',
};
