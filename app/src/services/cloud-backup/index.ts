// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  APP_DATA_FOLDER_ID,
  MIME_TYPES,
} from '@robinbobin/react-native-google-drive-api-wrapper';
import type { GDrive } from '@robinbobin/react-native-google-drive-api-wrapper';

import { createGDrive } from '@/services/cloud-backup/google';
import { FILE_NAME } from '@/services/cloud-backup/helpers';
import {
  disableBackup as disableIosBackup,
  download as iosDownload,
  upload as iosUpload,
} from '@/services/cloud-backup/ios';
import { useSettingStore } from '@/stores/settingStore';
import type { Mnemonic } from '@/types/mnemonic';
import { parseMnemonic } from '@/utils/crypto/mnemonic';
import { withRetries } from '@/utils/retry';

export const STORAGE_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

function isDriveFile(file: unknown): file is { id: string } {
  return (
    typeof file === 'object' &&
    file !== null &&
    typeof (file as { id?: unknown }).id === 'string'
  );
}

/**
 * Resolve the single canonical Drive backup file, deleting any duplicate
 * name-matches it finds. Self-heals installs that accumulated duplicates before
 * single-file backup (F-08). Returns the surviving file id, or null if none.
 */
async function resolveCanonicalDriveFileId(
  gdrive: GDrive,
): Promise<string | null> {
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });
  const ids = (files as unknown[]).filter(isDriveFile).map(file => file.id);
  if (ids.length === 0) {
    return null;
  }
  const [canonicalId, ...duplicates] = ids;
  if (duplicates.length > 0) {
    await Promise.all(duplicates.map(id => gdrive.files.delete(id)));
  }
  return canonicalId;
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
  // Delete the canonical file plus any duplicate name-matches (self-healing),
  // then forget the stored id.
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
  useSettingStore.getState().setBackupFileId(null);
}

export async function download() {
  if (Platform.OS === 'ios') {
    return iosDownload();
  }

  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new Error('User canceled Google sign-in');
  }
  const { backupFileId, setBackupFileId } = useSettingStore.getState();
  let fileId = backupFileId;
  if (!fileId) {
    fileId = await resolveCanonicalDriveFileId(gdrive);
    if (fileId) {
      setBackupFileId(fileId);
    }
  }

  if (!fileId) {
    throw new Error(
      'Couldnt find the encrypted backup, did you back it up previously?',
    );
  }
  const resolvedFileId = fileId;
  const mnemonicString = await withRetries(() =>
    gdrive.files.getText(resolvedFileId),
  );
  try {
    const mnemonic = parseMnemonic(mnemonicString);
    return mnemonic;
  } catch (e) {
    throw new Error(`Failed to parse mnemonic backup: ${(e as Error).message}`);
  }
}

export async function upload(mnemonic: Mnemonic) {
  if (!mnemonic || !mnemonic.phrase) {
    throw new Error(
      'Mnemonic not set yet. Did the user see the recovery phrase?',
    );
  }
  if (Platform.OS === 'ios') {
    // iOS overwrites a single fixed path, so it is already single-file.
    await iosUpload(mnemonic);
    return;
  }
  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new Error('User canceled Google sign-in');
  }
  const { backupFileId, setBackupFileId } = useSettingStore.getState();
  const data = JSON.stringify(mnemonic);

  // Prefer updating the known canonical file in place; otherwise adopt/dedupe
  // any existing file before creating one — so exactly one backup file exists
  // per account (F-08).
  const existingId =
    backupFileId ?? (await resolveCanonicalDriveFileId(gdrive));
  if (existingId) {
    try {
      await withRetries(() =>
        gdrive.files
          .newMultipartUploader()
          .setIdOfFileToUpdate(existingId)
          .setData(data)
          .setDataMimeType(MIME_TYPES.application.json)
          .setRequestBody({ name: FILE_NAME })
          .execute(),
      );
      setBackupFileId(existingId);
      return;
    } catch (e) {
      // Stored id may be stale (file deleted server-side); fall back to create.
      console.warn('Cloud backup update failed; creating a new file', e);
      setBackupFileId(null);
    }
  }

  const created = await withRetries(() =>
    gdrive.files
      .newMultipartUploader()
      .setData(data)
      .setDataMimeType(MIME_TYPES.application.json)
      .setRequestBody({ name: FILE_NAME, parents: [APP_DATA_FOLDER_ID] })
      .execute(),
  );
  if (isDriveFile(created)) {
    setBackupFileId(created.id);
  }
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
