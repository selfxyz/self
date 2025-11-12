// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  APP_DATA_FOLDER_ID,
  MIME_TYPES,
} from '@robinbobin/react-native-google-drive-api-wrapper';

import { createGDrive } from '@/services/cloud-backup/google';
import { FILE_NAME } from '@/services/cloud-backup/helpers';
import {
  disableBackup as disableIosBackup,
  download as iosDownload,
  upload as iosUpload,
} from '@/services/cloud-backup/ios';
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

export async function download() {
  if (Platform.OS === 'ios') {
    return iosDownload();
  }

  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new Error('User canceled Google sign-in');
  }
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });

  const driveFiles: unknown[] = files;
  const firstFile = driveFiles[0];

  if (!isDriveFile(firstFile)) {
    throw new Error(
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
    await iosUpload(mnemonic);
  } else {
    const gdrive = await createGDrive();
    if (!gdrive) {
      throw new Error('User canceled Google sign-in');
    }
    await withRetries(() =>
      gdrive.files
        .newMultipartUploader()
        .setData(JSON.stringify(mnemonic))
        .setDataMimeType(MIME_TYPES.application.json)
        .setRequestBody({ name: FILE_NAME, parents: [APP_DATA_FOLDER_ID] })
        .execute(),
    );
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
