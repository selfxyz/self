// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import {
  APP_DATA_FOLDER_ID,
  MIME_TYPES,
} from '@robinbobin/react-native-google-drive-api-wrapper';
import { ethers } from 'ethers';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { CloudStorage, CloudStorageScope } from 'react-native-cloud-storage';

import { name } from '../../../package.json';
import { Mnemonic } from '../../types/mnemonic';
import { createGDrive } from './google';

const FOLDER = `/${name}`;
const ENCRYPTED_FILE_PATH = `/${FOLDER}/encrypted-private-key`;
if (Platform.OS === 'ios') {
  CloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
}

const FILE_NAME = 'encrypted-private-key';

export const STORAGE_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

/**
 * Type guard function to validate that an object conforms to the Mnemonic interface
 */
function isMnemonic(obj: unknown): obj is Mnemonic {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return !!(
    typeof candidate.phrase === 'string' &&
    typeof candidate.password === 'string' &&
    typeof candidate.entropy === 'string' &&
    candidate.wordlist &&
    typeof candidate.wordlist === 'object' &&
    typeof (candidate.wordlist as Record<string, unknown>).locale === 'string'
  );
}

/**
 * Safely parses and validates a mnemonic string
 */
function parseMnemonic(mnemonicString: string): Mnemonic {
  let parsed: unknown;

  try {
    parsed = JSON.parse(mnemonicString);
  } catch (e) {
    throw new Error('Invalid JSON format in mnemonic backup');
  }

  if (!isMnemonic(parsed)) {
    throw new Error(
      'Invalid mnemonic structure: missing required properties (phrase, password, wordlist, entropy)',
    );
  }

  if (!parsed.phrase || !ethers.Mnemonic.isValidMnemonic(parsed.phrase)) {
    throw new Error('Invalid mnemonic phrase: not a valid BIP39 mnemonic');
  }

  return parsed;
}

/**
 * For some reason google drive api can be very ... brittle and abort randomly (network conditions)
 * so retry a couple times for good measure.
 *
 * Filter the error message by checking if `abort` is included didnt help as the error can be `path not found`
 * maybe some race conditions on the drive side
 */
async function withRetries<T>(
  promiseBuilder: () => Promise<T>,
  retries = 10,
): Promise<T> {
  let latestError: Error;
  for (let i = 0; i < retries; i++) {
    try {
      return await promiseBuilder();
    } catch (e) {
      retries++;
      latestError = e as Error;
      if (retries < i - 1) {
        console.info('retry #', i);
        await new Promise(resolve => setTimeout(resolve, 200 * i));
      }
    }
  }
  throw new Error(
    `retry count exhausted (${retries}), original error ${latestError!}`,
  );
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

export async function upload(mnemonic: Mnemonic) {
  if (!mnemonic || !mnemonic.phrase) {
    throw new Error(
      'Mnemonic not set yet. Did the user see the recovery phrase?',
    );
  }
  if (Platform.OS === 'ios') {
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

export async function download() {
  if (Platform.OS === 'ios') {
    if (await CloudStorage.exists(ENCRYPTED_FILE_PATH)) {
      const mnemonicString = await withRetries(() =>
        CloudStorage.readFile(ENCRYPTED_FILE_PATH),
      );

      try {
        const mnemonic = parseMnemonic(mnemonicString);
        return mnemonic;
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

  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new Error('User canceled Google sign-in');
  }
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });
  if (!files.length || !files[0].id) {
    throw new Error(
      'Couldnt find the encrypted backup, did you back it up previously?',
    );
  }
  const mnemonicString = await withRetries(() =>
    gdrive.files.getText(files[0].id as string),
  );
  try {
    const mnemonic = parseMnemonic(mnemonicString);
    return mnemonic;
  } catch (e) {
    throw new Error(`Failed to parse mnemonic backup: ${(e as Error).message}`);
  }
}

export async function disableBackup() {
  if (Platform.OS === 'ios') {
    await withRetries(() => CloudStorage.rmdir(FOLDER, { recursive: true }));
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
    files.filter(f => f.id).map(f => gdrive.files.delete(f.id as string)),
  );
}
