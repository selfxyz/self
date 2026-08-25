// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Why a cloud backup could not be read. Recovery screens map these to per-branch
 * copy and to the `reason` property on restore-failure analytics, so a failure is
 * never reported to the user or to telemetry as an undifferentiated "unknown".
 */
export type CloudBackupErrorReason =
  /** Android only: the Google sign-in sheet returned no account. */
  | 'sign_in_cancelled'
  /**
   * Android only: the Google sign-in ended in an error — misconfiguration,
   * revoked consent or a network failure — rather than a completed sign-in
   * or a user cancel.
   */
  | 'sign_in_failed'
  /** iOS only: iCloud Drive is off or the device is signed out of iCloud. */
  | 'cloud_unavailable'
  /** Reached the provider, but this account holds no backup file. */
  | 'no_backup_found'
  /**
   * iOS only: the backup exists in iCloud but hasn't finished downloading to
   * this device. Retryable — the download continues in the background.
   */
  | 'backup_not_synced'
  /** Found a backup file whose contents are not a usable mnemonic. */
  | 'backup_corrupt'
  /**
   * Anything else from the storage layer. `withRetries` replaces the original
   * error with a fresh one, so every classifiable branch must throw outside it —
   * whatever escapes the retry wrapper is unclassifiable by construction.
   */
  | 'backup_read_failed';

export class CloudBackupError extends Error {
  readonly reason: CloudBackupErrorReason;

  constructor(
    reason: CloudBackupErrorReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'CloudBackupError';
    this.reason = reason;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export function isCloudBackupError(error: unknown): error is CloudBackupError {
  return error instanceof CloudBackupError;
}
