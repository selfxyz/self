// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { CloudStorage } from 'react-native-cloud-storage';

import { ENCRYPTED_FILE_PATH, FOLDER } from '@/services/cloud-backup/helpers';
import type { Mnemonic } from '@/types/mnemonic';
import { parseMnemonic } from '@/utils/crypto/mnemonic';
import { withRetries } from '@/utils/retry';

export async function disableBackup() {
  await withRetries(() => CloudStorage.rmdir(FOLDER, { recursive: true }));
}

export async function download() {
  if (await CloudStorage.exists(ENCRYPTED_FILE_PATH)) {
    const mnemonicString = await withRetries(() =>
      CloudStorage.readFile(ENCRYPTED_FILE_PATH),
    );
    try {
      return parseMnemonic(mnemonicString);
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

export async function upload(mnemonic: Mnemonic) {
  try {
    await CloudStorage.mkdir(FOLDER);
  } catch (e) {
    console.error(e);
    if (!(e as Error).message.includes('already')) {
      throw e;
    }
  }
  await withRetries(() =>
    CloudStorage.writeFile(ENCRYPTED_FILE_PATH, JSON.stringify(mnemonic)),
  );
}
