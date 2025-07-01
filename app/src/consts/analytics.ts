// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

export const AppEvents = {
  DISMISS_PRIVACY_DISCLAIMER: 'App: Dismiss Privacy Disclaimer',
  GET_STARTED: 'App: Get Started',
  SUPPORTED_BIOMETRIC_IDS: 'App: Supported Biometric IDs',
  UPDATE_MODAL_CLOSED: 'App: Update Modal Closed',
  UPDATE_MODAL_OPENED: 'App: Update Modal Opened',
  UPDATE_STARTED: 'App: Update Started',
};

export const NotificationEvents = {
  BACKGROUND_NOTIFICATION_OPENED:
    'Notification: Background Notification Opened',
  COLD_START_NOTIFICATION_OPENED:
    'Notification: Cold Start Notification Opened',
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

export const PassportEvents = {
  CAMERA_SCAN_CANCELLED: 'Passport: Camera Scan Cancelled',
  CAMERA_SCREEN_CLOSED: 'Passport: Camera View Closed',
  CAMERA_SCAN_FAILED: 'Passport: Camera Scan Failed',
  CAMERA_SCAN_STARTED: 'Passport: Camera Scan Started',
  CAMERA_SCAN_SUCCESS: 'Passport: Camera Scan Success',
  CANCEL_PASSPORT_NFC: 'Passport: Cancel Passport NFC',
  DATA_LOAD_ERROR: 'Passport: Passport Data Load Error',
  DISMISS_UNSUPPORTED_PASSPORT: 'Passport: Dismiss Unsupported Passport',
  NFC_RESPONSE_PARSE_FAILED: 'Passport: Parsing NFC Response Unsuccessful',
  NFC_SCAN_FAILED: 'Passport: NFC Scan Failed',
  NFC_SCAN_SUCCESS: 'Passport: NFC Scan Success',
  OPEN_NFC_SETTINGS: 'Passport: Open NFC Settings',
  OWNERSHIP_CONFIRMED: 'Passport: Passport Ownership Confirmed',
  PASSPORT_PARSE_FAILED: 'Passport: Passport Parse Failed',
  PASSPORT_PARSED: 'Passport: Passport Parsed',
  START_PASSPORT_NFC: 'Passport: Start Passport NFC',
  UNSUPPORTED_PASSPORT: 'Passport: Passport Not Supported',
};

export const ProofEvents = {
  FCM_TOKEN_STORED: 'Proof: FCM Token Stored Successfully',
  NOTIFICATION_PERMISSION_REQUESTED: 'Proof: Notification Permission Requested',
  PROOF_COMPLETED: 'Proof: Proof Completed',
  PROOF_DISCLOSURES_SCROLLED: 'Proof: Proof Disclosures Scrolled',
  PROOF_FAILED: 'Proof: Proof Failed',
  PROOF_RESULT_ACKNOWLEDGED: 'Proof: Proof Result Acknowledged',
  PROOF_VERIFICATION_STARTED: 'Proof: Proof Verification Started',
  PROVING_PROCESS_ERROR: 'Proof: Proving Process Error',
  PROVING_STATE_CHANGE: 'Proof: Proving State Change',
  PROVING_STORE_REINITIALIZED: 'Proof: Proving Store Re-initialized',
  REGISTER_COMPLETED: 'Proof: Register Completed',
  ALREADY_REGISTERED: 'Proof: Already Registered',
  QR_SCAN_CANCELLED: 'Proof: QR Scan Cancelled',
  QR_SCAN_FAILED: 'Proof: QR Scan Failed',
  QR_SCAN_SUCCESS: 'Proof: QR Scan Success',
};

export const SettingsEvents = {
  CONNECTION_MODAL_CLOSED: 'Settings: Connection Modal Closed',
  CONNECTION_MODAL_OPENED: 'Settings: Connection Modal Opened',
  CONNECTION_SETTINGS_OPENED: 'Settings: Connection Settings Opened',
};

export const BackupEvents = {
  ACCOUNT_RECOVERY_STARTED: 'Backup: Account Recovery Started',
  ACCOUNT_RECOVERY_COMPLETED: 'Backup: Account Recovery Completed',
  ACCOUNT_VERIFICATION_COMPLETED: 'Backup: Account Verification Completed',
  CLOUD_BACKUP_CONTINUE: 'Backup: Cloud Backup Continue',
  CLOUD_BACKUP_STARTED: 'Backup: Cloud Backup Started',
  CLOUD_BACKUP_CANCELLED: 'Backup: Cloud Backup Cancelled',
  CLOUD_BACKUP_DISABLED_DONE: 'Backup: Cloud Backup Disabled Done',
  CLOUD_BACKUP_DISABLE_STARTED: 'Backup: Cloud Backup Disable Started',
  CLOUD_BACKUP_ENABLED_DONE: 'Backup: Cloud Backup Enabled Done',
  CLOUD_BACKUP_ENABLE_STARTED: 'Backup: Cloud Backup Enable Started',
  CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED:
    'Backup: Cloud Restore Failed: Passport Not Registered',
  CLOUD_RESTORE_FAILED_UNKNOWN: 'Backup: Cloud Restore Failed: Unknown Error',
  CLOUD_RESTORE_SUCCESS: 'Backup: Cloud Restore Success',
  CREATE_NEW_ACCOUNT: 'Backup: Create New Account',
  MANUAL_RECOVERY_SELECTED: 'Backup: Manual Recovery Selected',
};

export const MockDataEvents = {
  CANCEL_GENERATION: 'Mock Data: Cancel Generation',
  CREATE_DEEP_LINK: 'Mock Data: Create Deep Link',
  DECREASE_EXPIRY_YEARS: 'Mock Data: Decrease Expiry Years',
  ENABLE_ADVANCED_MODE: 'Mock Data: Enable Advanced Mode',
  GENERATE_DATA: 'Mock Data: Generate Data',
  INCREASE_EXPIRY_YEARS: 'Mock Data: Increase Expiry Years',
  OPEN_ALGORITHM_SELECTION: 'Mock Data: Open Algorithm Selection',
  OPEN_COUNTRY_SELECTION: 'Mock Data: Open Country Selection',
  SELECT_ALGORITHM: 'Mock Data: Select Algorithm',
  SELECT_COUNTRY: 'Mock Data: Select Country',
  TOGGLE_OFAC_LIST: 'Mock Data: Toggle OFAC List',
};

export const DocumentEvents = {
  MANAGE_SCREEN_OPENED: 'Document: Manage Documents Screen Opened',
  DOCUMENTS_FETCHED: 'Document: Documents Fetched',
  NO_DOCUMENTS_FOUND: 'Document: No Documents Found',
  DOCUMENT_SELECTED: 'Document: Document Selected',
  DOCUMENT_DELETED: 'Document: Document Deleted',
  ADD_NEW_SCAN_SELECTED: 'Document: Add New Document via Scan',
  ADD_NEW_MOCK_SELECTED: 'Document: Add New Document via Mock',
  PASSPORT_INFO_OPENED: 'Document: Passport Info Screen Opened',
  PASSPORT_METADATA_LOADED: 'Document: Passport Metadata Loaded',
};
