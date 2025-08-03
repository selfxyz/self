// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useMemo } from 'react';
import { Platform } from 'react-native';

import type { Mnemonic } from '../../types/mnemonic';
import { createGDrive } from './google';
import { FILE_NAME, parseMnemonic, withRetries } from './helpers';
import * as ios from './ios';

import {
  APP_DATA_FOLDER_ID,
  MIME_TYPES,
} from '@robinbobin/react-native-google-drive-api-wrapper';

export const STORAGE_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

export async function disableBackup() {
  if (Platform.OS === 'ios') {
    await ios.disableBackup();
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
  await Promise.all(
    files.map((f: any) => {
      const id = f.id as string;
      return id ? gdrive.files.delete(id) : Promise.resolve();
    }),
  );
}

export async function download() {
  if (Platform.OS === 'ios') {
    return ios.download();
  }

  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new Error('User canceled Google sign-in');
  }
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });
  if (!files.length) {
    throw new Error(
      'Couldnt find the encrypted backup, did you back it up previously?',
    );
  }
  const fileId = (files[0] as any).id as string;
  if (!fileId) {
    throw new Error(
      'Couldnt find the encrypted backup, did you back it up previously?',
    );
  }
  const mnemonicString = await withRetries(() => gdrive.files.getText(fileId));
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
    await ios.upload(mnemonic);
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
