/** * Generic reasons:
 * - network_error: Network connectivity issues
 * - user_cancelled: User cancelled the operation
 * - permission_denied: Permission not granted
 * - invalid_input: Invalid user input
 * - timeout: Operation timed out
 * - unknown_error: Unspecified error * * Auth specific:
 * - invalid_credentials: Invalid login credentials
 * - biometric_unavailable: Biometric authentication unavailable
 * - invalid_mnemonic: Invalid mnemonic phrase * * Passport specific:
 * - invalid_format: Invalid passport format
 * - expired_passport: Passport is expired
 * - scan_error: Error during scanning
 * - nfc_error: NFC read error * * Proof specific:
 * - verification_failed: Proof verification failed
 * - session_expired: Session expired
 * - missing_fields: Required fields missing * * Backup specific:
 * - backup_not_found: Backup not found
 * - cloud_service_unavailable: Cloud service unavailable
 * */
export interface TrackEventParams {
  reason?: string | null;
  duration_seconds?: number;
  attempt_count?: number;
  [key: string]: unknown;
}
