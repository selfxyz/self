/**
 * Analytics Event Constants
 *
 * This file contains all analytics event names used in the app.
 * Always use these constants instead of string literals when tracking events.
 */

// Event Categories
export enum EventCategory {
  AUTH = 'Auth',
  PASSPORT = 'Passport',
  PROOF = 'Proof',
  SETTINGS = 'Settings',
  BACKUP = 'Backup',
  APP = 'App',
}

// Suggested common reason codes for error events
// Use these strings for the 'reason' parameter in error events for consistency
/**
 * Generic reasons:
 * - network_error: Network connectivity issues
 * - user_cancelled: User cancelled the operation
 * - permission_denied: Permission not granted
 * - invalid_input: Invalid user input
 * - timeout: Operation timed out
 * - unknown_error: Unspecified error
 *
 * Auth specific:
 * - invalid_credentials: Invalid login credentials
 * - biometric_unavailable: Biometric authentication unavailable
 * - invalid_mnemonic: Invalid mnemonic phrase
 *
 * Passport specific:
 * - invalid_format: Invalid passport format
 * - expired_passport: Passport is expired
 * - scan_error: Error during scanning
 * - nfc_error: NFC read error
 *
 * Proof specific:
 * - verification_failed: Proof verification failed
 * - session_expired: Session expired
 * - missing_fields: Required fields missing
 *
 * Backup specific:
 * - backup_not_found: Backup not found
 * - cloud_service_unavailable: Cloud service unavailable
 */

export const AppEvents = {
  UPDATE_AVAILABLE: `${EventCategory.APP}: Update Available`,
  UPDATE_STARTED: `${EventCategory.APP}: Update Started`,
  UPDATE_MODAL_OPENED: `${EventCategory.APP}: Update Modal Opened`,
  UPDATE_MODAL_CLOSED: `${EventCategory.APP}: Update Modal Closed`,
  DISCLAIMER_DISMISSED: `${EventCategory.APP}: Disclaimer Dismissed`,
};

export const AuthEvents = {
  LOGIN_SUCCESS: `${EventCategory.AUTH}: Login Success`,
  LOGIN_FAILED: `${EventCategory.AUTH}: Login Failed`,
  BIOMETRIC_AUTH_SUCCESS: `${EventCategory.AUTH}: Biometric Auth Success`,
  BIOMETRIC_AUTH_FAILED: `${EventCategory.AUTH}: Biometric Auth Failed`,
  BIOMETRIC_CHECK: `${EventCategory.AUTH}: Biometrics Check`,
  BIOMETRIC_LOGIN_ATTEMPT: `${EventCategory.AUTH}: Biometric Login Attempt`,
  BIOMETRIC_LOGIN_SUCCESS: `${EventCategory.AUTH}: Biometric Login Success`,
  BIOMETRIC_LOGIN_FAILED: `${EventCategory.AUTH}: Biometric Login Failed`,
  BIOMETRIC_LOGIN_CANCELLED: `${EventCategory.AUTH}: Biometric Login Cancelled`,
  AUTHENTICATION_TIMEOUT: `${EventCategory.AUTH}: Authentication Timeout`,
  MNEMONIC_LOADED: `${EventCategory.AUTH}: Mnemonic Loaded`,
  MNEMONIC_CREATED: `${EventCategory.AUTH}: Mnemonic Created`,
  MNEMONIC_RESTORE_SUCCESS: `${EventCategory.AUTH}: Mnemonic Restore Success`,
  MNEMONIC_RESTORE_FAILED: `${EventCategory.AUTH}: Mnemonic Restore Failed`,
};

export const PassportEvents = {
  SCAN_STARTED: `${EventCategory.PASSPORT}: Scan Started`,
  CAMERA_SCAN_SUCCESS: `${EventCategory.PASSPORT}: Camera Scan Success`,
  CAMERA_SCAN_FAILED: `${EventCategory.PASSPORT}: Camera Scan Failed`,
  NFC_SCAN_SUCCESS: `${EventCategory.PASSPORT}: NFC Scan Success`,
  NFC_SCAN_FAILED: `${EventCategory.PASSPORT}: NFC Scan Failed`,
  PASSPORT_PARSED: `${EventCategory.PASSPORT}: Passport Parsed`,
  PARSE_FAILED: `${EventCategory.PASSPORT}: Parse Failed`,
  OWNERSHIP_CONFIRMED: `${EventCategory.PASSPORT}: Ownership Confirmed`,
};

export const ProofEvents = {
  VERIFICATION_STARTED: `${EventCategory.PROOF}: Verification Started`,
  VERIFICATION_COMPLETED: `${EventCategory.PROOF}: Verification Completed`,
  VERIFICATION_FAILED: `${EventCategory.PROOF}: Verification Failed`,
  QR_SCAN_SUCCESS: `${EventCategory.PROOF}: QR Scan Success`,
  QR_SCAN_FAILED: `${EventCategory.PROOF}: QR Scan Failed`,
  DISCLOSURES_VIEWED: `${EventCategory.PROOF}: Disclosures Viewed`,
  NOTIFICATION_PERMISSION_REQUESTED: `${EventCategory.PROOF}: Notification Permission Requested`,
  FCM_TOKEN_STORED: `${EventCategory.PROOF}: FCM Token Stored`,
};

export const SettingsEvents = {
  CONNECTION_SETTINGS_OPENED: `${EventCategory.SETTINGS}: Connection Settings Opened`,
  CONNECTION_MODAL_OPENED: `${EventCategory.SETTINGS}: Connection Modal Opened`,
  CONNECTION_MODAL_CLOSED: `${EventCategory.SETTINGS}: Connection Modal Closed`,
};

export const BackupEvents = {
  CLOUD_BACKUP_ENABLE_STARTED: `${EventCategory.BACKUP}: Cloud Backup Enable Started`,
  CLOUD_BACKUP_ENABLED: `${EventCategory.BACKUP}: Cloud Backup Enabled`,
  CLOUD_BACKUP_DISABLE_STARTED: `${EventCategory.BACKUP}: Cloud Backup Disable Started`,
  CLOUD_BACKUP_DISABLED: `${EventCategory.BACKUP}: Cloud Backup Disabled`,
  CLOUD_BACKUP_CANCELLED: `${EventCategory.BACKUP}: Cloud Backup Cancelled`,

  CLOUD_RESTORE_SUCCESS: `${EventCategory.BACKUP}: Cloud Restore Success`,
  CLOUD_RESTORE_FAILED: `${EventCategory.BACKUP}: Cloud Restore Failed`,

  MANUAL_RECOVERY_SELECTED: `${EventCategory.BACKUP}: Manual Recovery Selected`,
};

export const createButtonClickEvent = (buttonName: string): string => {
  return `Click: ${buttonName}`;
};

export type EventName =
  | (typeof AuthEvents)[keyof typeof AuthEvents]
  | (typeof PassportEvents)[keyof typeof PassportEvents]
  | (typeof ProofEvents)[keyof typeof ProofEvents]
  | (typeof SettingsEvents)[keyof typeof SettingsEvents]
  | (typeof BackupEvents)[keyof typeof BackupEvents]
  | (typeof AppEvents)[keyof typeof AppEvents]
  | ReturnType<typeof createButtonClickEvent>;

// Helper function to create event with params
export interface EventParams {
  reason?: string | null;
  duration_seconds?: number;
  attempt_count?: number;
  [key: string]: any;
}
