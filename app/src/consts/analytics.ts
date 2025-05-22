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

import { EventCategory } from '../utils/analytics';

/**
 * Creates event names by prefixing each event name with its category.
 *
 * @example
 * createEventNames(EventCategory.APP, {
 *   UPDATE_AVAILABLE: 'Update Available'
 * })
 * // Returns: { UPDATE_AVAILABLE: 'App: Update Available' }
 */
const createEventNames = (
  category: EventCategory,
  events: Record<string, string>,
) =>
  Object.fromEntries(
    Object.entries(events).map(([key, value]) => [
      key,
      `${category}: ${value}`,
    ]),
  );

export const AppEvents = createEventNames(EventCategory.APP, {
  UPDATE_STARTED: 'Update Started',
  UPDATE_MODAL_OPENED: 'Update Modal Opened',
  UPDATE_MODAL_CLOSED: 'Update Modal Closed',
});

export const AuthEvents = createEventNames(EventCategory.AUTH, {
  BIOMETRIC_AUTH_SUCCESS: 'Biometric Auth Success',
  BIOMETRIC_AUTH_FAILED: 'Biometric Auth Failed',
  BIOMETRIC_CHECK: 'Biometrics Check',
  BIOMETRIC_LOGIN_ATTEMPT: 'Biometric Login Attempt',
  BIOMETRIC_LOGIN_SUCCESS: 'Biometric Login Success',
  BIOMETRIC_LOGIN_FAILED: 'Biometric Login Failed',
  BIOMETRIC_LOGIN_CANCELLED: 'Biometric Login Cancelled',
  AUTHENTICATION_TIMEOUT: 'Authentication Timeout',
  MNEMONIC_LOADED: 'Mnemonic Loaded',
  MNEMONIC_CREATED: 'Mnemonic Created',
  MNEMONIC_RESTORE_SUCCESS: 'Mnemonic Restore Success',
  MNEMONIC_RESTORE_FAILED: 'Mnemonic Restore Failed',
});

export const PassportEvents = createEventNames(EventCategory.PASSPORT, {
  CAMERA_SCAN_SUCCESS: 'Camera Scan Success',
  CAMERA_SCAN_FAILED: 'Camera Scan Failed',
  NFC_SCAN_SUCCESS: 'NFC Scan Success',
  NFC_SCAN_FAILED: 'NFC Scan Failed',
  PASSPORT_PARSED: 'Passport Parsed',
  PASSPORT_PARSE_FAILED: 'Passport Parse Failed',
  OWNERSHIP_CONFIRMED: 'Passport Ownership Confirmed',
  DATA_LOAD_ERROR: 'Passport Data Load Error',
  NFC_RESPONSE_PARSE_FAILED: 'Parsing NFC Response Unsuccessful',
  START_PASSPORT_NFC: 'Start Passport NFC',
  OPEN_NFC_SETTINGS: 'Open NFC Settings',
  CANCEL_PASSPORT_NFC: 'Cancel Passport NFC',
});

export const ProofEvents = createEventNames(EventCategory.PROOF, {
  QR_SCAN_SUCCESS: 'QR Scan Success',
  QR_SCAN_FAILED: 'QR Scan Failed',
  NOTIFICATION_PERMISSION_REQUESTED: 'Notification Permission Requested',
  FCM_TOKEN_STORED: 'FCM Token Stored Successfully',
  PROVING_STATE_CHANGE: 'Proving State Change',
  PROVING_PROCESS_ERROR: 'Proving Process Error',
  PROOF_COMPLETED: 'Proof Completed',
  PROOF_FAILED: 'Proof Failed',
  PROOF_RESULT_ACKNOWLEDGED: 'Proof Result Acknowledged',
  PROOF_VERIFICATION_STARTED: 'Proof Verification Started',
  PROOF_DISCLOSURES_SCROLLED: 'Proof Disclosures Scrolled',
});

export const SettingsEvents = createEventNames(EventCategory.SETTINGS, {
  CONNECTION_SETTINGS_OPENED: 'Connection Settings Opened',
  CONNECTION_MODAL_OPENED: 'Connection Modal Opened',
  CONNECTION_MODAL_CLOSED: 'Connection Modal Closed',
});

export const BackupEvents = createEventNames(EventCategory.BACKUP, {
  CLOUD_BACKUP_ENABLE_STARTED: 'Cloud Backup Enable Started',
  CLOUD_BACKUP_DISABLE_STARTED: 'Cloud Backup Disable Started',
  CLOUD_BACKUP_CANCELLED: 'Cloud Backup Cancelled',
  CLOUD_RESTORE_SUCCESS: 'Cloud Restore Success',
  CLOUD_RESTORE_FAILED_UNKNOWN: 'Cloud Restore Failed: Unknown Error',
  CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED:
    'Cloud Restore Failed: Passport Not Registered',
  MANUAL_RECOVERY_SELECTED: 'Manual Recovery Selected',
  CLOUD_BACKUP_DISABLED_DONE: 'Cloud Backup Disabled Done',
  CLOUD_BACKUP_ENABLED_DONE: 'Cloud Backup Enabled Done',
});

export const MockDataEvents = createEventNames(EventCategory.MOCK_DATA, {
  ENABLE_ADVANCED_MODE: 'Enable Advanced Mode',
  OPEN_ALGORITHM_SELECTION: 'Open Algorithm Selection',
  OPEN_COUNTRY_SELECTION: 'Open Country Selection',
  DECREASE_EXPIRY_YEARS: 'Decrease Expiry Years',
  INCREASE_EXPIRY_YEARS: 'Increase Expiry Years',
  TOGGLE_OFAC_LIST: 'Toggle OFAC List',
  SELECT_COUNTRY: 'Select Country',
  SELECT_ALGORITHM: 'Select Algorithm',
  GENERATE_DATA: 'Generate Data',
  CANCEL_GENERATION: 'Cancel Generation',
});
