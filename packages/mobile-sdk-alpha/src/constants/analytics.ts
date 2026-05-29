// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export const AadhaarEvents = {
  CONTINUE_PRESSED: 'Aadhaar: Continue Pressed',
  DATA_STORED: 'Aadhaar: Data Stored',
  PHOTO_PERMISSION_DENIED: 'Aadhaar: Photo Permission Denied',
  QR_PARSE_FAILED: 'Aadhaar: QR Parse Failed',
  QR_SELECTED: 'Aadhaar: QR Selected',
  TIMESTAMP_EXPIRED: 'Aadhaar: Timestamp Expired',
  UPLOAD_STARTED: 'Aadhaar: Upload Started',
} as const;

export const AppEvents = {
  DISMISS_PRIVACY_DISCLAIMER: 'App: Dismiss Privacy Disclaimer',
  GET_STARTED: 'App: Get Started',
  GET_STARTED_AADHAAR: 'App: Get Started - Aadhaar',
  GET_STARTED_BIOMETRIC: 'App: Get Started - Biometric ID',
  SUPPORTED_BIOMETRIC_IDS: 'App: Supported Biometric IDs',
  UPDATE_MODAL_CLOSED: 'App: Update Modal Closed',
  UPDATE_MODAL_OPENED: 'App: Update Modal Opened',
  UPDATE_STARTED: 'App: Update Started',
} as const;

export const AuthEvents = {
  BIOMETRIC_LOGIN_CANCELLED: 'Auth: Biometric Login Cancelled',
  BIOMETRIC_LOGIN_FAILED: 'Auth: Biometric Login Failed',
  BIOMETRIC_LOGIN_SUCCESS: 'Auth: Biometric Login Success',
} as const;

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
} as const;

export const BiometricEvents = {
  DATA_CONFIRMATION_CONFIRMED: 'Biometric: Data Confirmation Confirmed',
  DATA_CONFIRMATION_VIEWED: 'Biometric: Data Confirmation Viewed',
  DOCUMENT_PARSED: 'Biometric: Document Parsed',
  DOCUMENT_UNSUPPORTED: 'Biometric: Document Unsupported',
  MRZ_CAPTURED: 'Biometric: MRZ Captured',
  MRZ_STARTED: 'Biometric: MRZ Started',
  NFC_STARTED: 'Biometric: NFC Started',
  NFC_SUCCEEDED: 'Biometric: NFC Succeeded',

  NFC_RESPONSE_PARSE_FAILED: 'Passport: Parsing NFC Response Unsuccessful',
  NFC_SCAN_FAILED: 'Passport: NFC Scan Failed',
} as const;

export const DocumentEvents = {
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
} as const;

export const KycEvents = {
  PROVIDER_CLOSED: 'KYC: Provider Closed',
  PROVIDER_OPENED: 'KYC: Provider Opened',
  RETRY_TRIGGERED: 'KYC: Retry Triggered',
  SESSION_CREATED: 'KYC: Session Created',
  SESSION_REQUESTED: 'KYC: Session Requested',
  VERIFICATION_RESOLVED: 'KYC: Verification Resolved',
} as const;

export const IDDataEvents = {
  PERKS_VIEWED: 'ID Data: Perks Viewed',
  PERK_TAPPED: 'ID Data: Perk Tapped',
  PERK_OUTLINK_OPEN_FAILED: 'ID Data: Perk Outlink Open Failed',
} as const;

export const HomescreenEvents = {
  ID_CARD_VIEWED: 'Homescreen: ID Card Viewed',
  ID_CARD_PERK_TAPPED: 'Homescreen: ID Card Perk Tapped',
  ID_CARD_PERK_OUTLINK_OPEN_FAILED: 'Homescreen: ID Card Perk Outlink Open Failed',
} as const;

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
} as const;

export const NotificationEvents = {
  BACKGROUND_NOTIFICATION_OPENED: 'Notification: Background Notification Opened',
  COLD_START_NOTIFICATION_OPENED: 'Notification: Cold Start Notification Opened',
} as const;

export const OnboardingEvents = {
  STARTED: 'Onboarding: Started',
  COUNTRY_SELECTED: 'Onboarding: Country Selected',
  DOCUMENT_TYPE_SELECTED: 'Onboarding: Document Type Selected',
  SCAN_STARTED: 'Onboarding: Document Scan Started',
  SCAN_SUCCEEDED: 'Onboarding: Document Scan Succeeded',
  PROOF_STARTED: 'Onboarding: Proof Generation Started',
  PROOF_SUCCEEDED: 'Onboarding: Proof Generation Succeeded',
  ENDED: 'Onboarding: Ended',
  STEP_RETRIED: 'Onboarding: Step Retried',
} as const;

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
} as const;

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
} as const;

export const ProofRequestPickerEvents = {
  VIEWED: 'proof_request_picker_viewed',
  ID_SELECTED: 'proof_request_id_selected',
  INELIGIBLE_ID_TAPPED: 'proof_request_ineligible_id_tapped',
} as const;

export const SettingsEvents = {
  CONNECTION_MODAL_CLOSED: 'Settings: Connection Modal Closed',
  CONNECTION_MODAL_OPENED: 'Settings: Connection Modal Opened',
  CONNECTION_SETTINGS_OPENED: 'Settings: Connection Settings Opened',
} as const;

// Union per-group so collisions on shared keys (e.g. STARTED, FAILED) across
// groups can't silently drop event names from the cap.
export type KnownEventName =
  | (typeof AadhaarEvents)[keyof typeof AadhaarEvents]
  | (typeof AppEvents)[keyof typeof AppEvents]
  | (typeof AuthEvents)[keyof typeof AuthEvents]
  | (typeof BackupEvents)[keyof typeof BackupEvents]
  | (typeof BiometricEvents)[keyof typeof BiometricEvents]
  | (typeof DocumentEvents)[keyof typeof DocumentEvents]
  | (typeof HomescreenEvents)[keyof typeof HomescreenEvents]
  | (typeof IDDataEvents)[keyof typeof IDDataEvents]
  | (typeof KycEvents)[keyof typeof KycEvents]
  | (typeof MockDataEvents)[keyof typeof MockDataEvents]
  | (typeof NotificationEvents)[keyof typeof NotificationEvents]
  | (typeof OnboardingEvents)[keyof typeof OnboardingEvents]
  | (typeof PointEvents)[keyof typeof PointEvents]
  | (typeof ProofEvents)[keyof typeof ProofEvents]
  | (typeof ProofRequestPickerEvents)[keyof typeof ProofRequestPickerEvents]
  | (typeof SettingsEvents)[keyof typeof SettingsEvents];
