import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  CloudStorage,
  CloudStorageProvider,
  CloudStorageScope,
} from 'react-native-cloud-storage';

import { ethers } from 'ethers';

import { name } from '../../../package.json';
import { Mnemonic } from '../../types/mnemonic';
import { googleSignIn } from './google';

const FOLDER = `/${name}`;
const ENCRYPTED_FILE_PATH = `/${FOLDER}/encrypted-private-key`;
CloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });

export const STORAGE_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

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

async function addAccessTokenForGoogleDrive() {
  if (CloudStorage.getProvider() === CloudStorageProvider.GoogleDrive) {
    const response = await googleSignIn();
    if (!response) {
      // user canceled
      return;
    }
    CloudStorage.setProviderOptions({
      accessToken: response.accessToken,
    });
  }
}

async function upload(mnemonic: Mnemonic) {
  if (!mnemonic || !mnemonic.phrase) {
    throw new Error(
      'Mnemonic not set yet. Did the user see the recovery phrase?',
    );
  }

  await addAccessTokenForGoogleDrive();
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

async function download() {
  await addAccessTokenForGoogleDrive();
  if (await CloudStorage.exists(ENCRYPTED_FILE_PATH)) {
    const mnemonicString = await withRetries(() =>
      CloudStorage.readFile(ENCRYPTED_FILE_PATH),
    );

    try {
      const mnemonic = JSON.parse(mnemonicString) as Mnemonic;
      if (
        !mnemonic.phrase ||
        !ethers.Mnemonic.isValidMnemonic(mnemonic.phrase)
      ) {
        throw new Error();
      }
      return mnemonic;
    } catch (e) {
      throw new Error(
        `Malformed mnemonic, expected JSON structure, got ${mnemonicString}`,
      );
    }
  }
  throw new Error(
    'Couldnt find the encrypted backup, did you back it up previously?',
  );
}

async function disableBackup() {
  await addAccessTokenForGoogleDrive();
  withRetries(() => CloudStorage.rmdir(FOLDER, { recursive: true }));
}
