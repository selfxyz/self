// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { CloudStorage } from 'react-native-cloud-storage';

import type { CloudBackupPayload } from '@/utils/cloudBackup/helpers';
import {
  ENCRYPTED_FILE_PATH,
  FOLDER,
  parseBackupPayload,
  withRetries,
} from '@/utils/cloudBackup/helpers';

export async function disableBackup() {
  await withRetries(() => CloudStorage.rmdir(FOLDER, { recursive: true }));
}

export async function download() {
  if (await CloudStorage.exists(ENCRYPTED_FILE_PATH)) {
    const mnemonicString = await withRetries(() =>
      CloudStorage.readFile(ENCRYPTED_FILE_PATH),
    );
    try {
      return parseBackupPayload(mnemonicString);
    } catch (e) {
      throw new Error(
        `Failed to parse mnemonic backup: ${(e as Error).message}`,
      );
    }
  }

  throw new Error(
    'Couldnt find the encrypted backup, did you back it up previously?',
  );
}

export async function upload(payload: CloudBackupPayload) {
  try {
    await CloudStorage.mkdir(FOLDER);
  } catch (e) {
    console.error(e);
    if (!(e as Error).message.includes('already')) {
      throw e;
    }
  }
  await withRetries(() =>
    CloudStorage.writeFile(ENCRYPTED_FILE_PATH, JSON.stringify(payload)),
  );
}
