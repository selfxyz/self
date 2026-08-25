// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  APP_DATA_FOLDER_ID,
  MIME_TYPES,
} from '@robinbobin/react-native-google-drive-api-wrapper';

import {
  CloudBackupError,
  isCloudBackupError,
} from '@/services/cloud-backup/errors';
import { createGDrive } from '@/services/cloud-backup/google';
import { FILE_NAME } from '@/services/cloud-backup/helpers';
import type {
  IosSyncOptions,
  UploadOutcome,
} from '@/services/cloud-backup/ios';
import {
  disableBackup as disableIosBackup,
  download as iosDownload,
  upload as iosUpload,
} from '@/services/cloud-backup/ios';
import type { Mnemonic } from '@/types/mnemonic';
import { mnemonicsMatch, parseMnemonic } from '@/utils/crypto/mnemonic';
import { withRetries } from '@/utils/retry';

export const STORAGE_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

function isDriveFile(file: unknown): file is { id: string } {
  return (
    typeof file === 'object' &&
    file !== null &&
    typeof (file as { id?: unknown }).id === 'string'
  );
}

export async function disableBackup() {
  if (Platform.OS === 'ios') {
    await disableIosBackup();
    return;
  }
  const gdrive = await createGDrive();
  if (!gdrive) {
    // User canceled Google sign-in; skip disabling backup gracefully.
    return;
  }
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });

  const driveFiles: unknown[] = files;

  await Promise.all(
    driveFiles.map(file => {
      return isDriveFile(file) && file.id
        ? gdrive.files.delete(file.id)
        : Promise.resolve();
    }),
  );
}

export async function download(options?: IosSyncOptions) {
  if (Platform.OS === 'ios') {
    return iosDownload(options);
  }
  // Android has no placeholder concept — Drive's file listing is authoritative,
  // so the sync options only apply to iOS.

  try {
    const gdrive = await createGDrive();
    if (!gdrive) {
      // `googleSignIn` only returns null for an actual user cancellation;
      // every other failure throws a typed `sign_in_failed` before this.
      throw new CloudBackupError(
        'sign_in_cancelled',
        'User canceled Google sign-in',
      );
    }
    const { files } = await gdrive.files.list({
      spaces: APP_DATA_FOLDER_ID,
      q: `name = '${FILE_NAME}'`,
    });

    const driveFiles: unknown[] = files;
    const firstFile = driveFiles[0];

    if (!isDriveFile(firstFile)) {
      throw new CloudBackupError(
        'no_backup_found',
        'Couldnt find the encrypted backup, did you back it up previously?',
      );
    }
    const mnemonicString = await withRetries(() =>
      gdrive.files.getText(firstFile.id),
    );
    try {
      const mnemonic = parseMnemonic(mnemonicString);
      return mnemonic;
    } catch (e) {
      throw new CloudBackupError(
        'backup_corrupt',
        `Failed to parse mnemonic backup: ${(e as Error).message}`,
        { cause: e },
      );
    }
  } catch (e) {
    if (isCloudBackupError(e)) {
      throw e;
    }
    // Drive rejected the list or read. `withRetries` replaces the original
    // error, so report a retryable read failure rather than a missing backup.
    throw new CloudBackupError(
      'backup_read_failed',
      `Failed to read the backup from Google Drive: ${(e as Error).message}`,
      { cause: e },
    );
  }
}

type GDriveClient = NonNullable<Awaited<ReturnType<typeof createGDrive>>>;

/**
 * Enumerates every backup file in the app-data folder — Drive identifies files
 * by ID, not name, so historical blind uploads left some accounts with several
 * files under the same name, and Drive pages listings at 100.
 */
async function listBackupFiles(gdrive: GDriveClient) {
  const collected: { id: string }[] = [];
  let pageToken: string | undefined;
  do {
    const response = await gdrive.files.list({
      spaces: APP_DATA_FOLDER_ID,
      q: `name = '${FILE_NAME}'`,
      ...(pageToken ? { pageToken } : {}),
    });
    const files: unknown[] = response.files;
    collected.push(...files.filter(isDriveFile));
    pageToken = (response as { nextPageToken?: string }).nextPageToken;
  } while (pageToken);
  return collected;
}

/**
 * Backs up the mnemonic, refusing to touch any backup that already exists.
 * See the iOS counterpart for the outcome semantics; the whole Android
 * check+write runs under the single sign-in from one `createGDrive()` call.
 */
export async function upload(
  mnemonic: Mnemonic,
  options?: IosSyncOptions,
): Promise<UploadOutcome> {
  if (!mnemonic || !mnemonic.phrase) {
    throw new Error(
      'Mnemonic not set yet. Did the user see the recovery phrase?',
    );
  }
  if (Platform.OS === 'ios') {
    return iosUpload(mnemonic, options);
  }

  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new CloudBackupError(
      'sign_in_cancelled',
      'User canceled Google sign-in',
    );
  }

  // Check phase, classified. One mismatched or unreadable file decides the
  // outcome, so the loop short-circuits. Write failures below stay raw.
  let existingCount = 0;
  try {
    const candidates = await listBackupFiles(gdrive);
    existingCount = candidates.length;
    for (const candidate of candidates) {
      const text = await withRetries(
        () => gdrive.files.getText(candidate.id),
        3,
      );
      let existing: Mnemonic;
      try {
        existing = parseMnemonic(text);
      } catch (e) {
        throw new CloudBackupError(
          'backup_conflict',
          `An existing Google Drive backup could not be read: ${(e as Error).message}`,
          { cause: e },
        );
      }
      if (!mnemonicsMatch(existing, mnemonic)) {
        throw new CloudBackupError(
          'backup_conflict',
          'An existing Google Drive backup does not match this device',
        );
      }
    }
  } catch (e) {
    if (isCloudBackupError(e)) {
      throw e;
    }
    throw new CloudBackupError(
      'backup_read_failed',
      `Failed to check for an existing Google Drive backup: ${(e as Error).message}`,
      { cause: e },
    );
  }

  if (existingCount > 0) {
    return 'already_backed_up';
  }

  await withRetries(() =>
    gdrive.files
      .newMultipartUploader()
      .setData(JSON.stringify(mnemonic))
      .setDataMimeType(MIME_TYPES.application.json)
      .setRequestBody({ name: FILE_NAME, parents: [APP_DATA_FOLDER_ID] })
      .execute(),
  );
  return 'created';
}

export function useBackupMnemonic() {
  return useMemo(
    () => ({
      upload,
      download,
      disableBackup,
    }),
    [],
  );
}
