// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import { Platform } from 'react-native';
import { CloudStorage, CloudStorageScope } from 'react-native-cloud-storage';

import type { Mnemonic } from '@/types/mnemonic';

import { name } from '../../../package.json';

export const FOLDER = `/${name}`;
export const ENCRYPTED_FILE_PATH = `/${FOLDER}/encrypted-private-key`;
export const FILE_NAME = 'encrypted-private-key';

if (Platform.OS === 'ios') {
  CloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
}

export function isMnemonic(obj: unknown): obj is Mnemonic {
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

export function parseMnemonic(mnemonicString: string): Mnemonic {
  let parsed: unknown;

  try {
    parsed = JSON.parse(mnemonicString);
  } catch {
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

export async function withRetries<T>(
  promiseBuilder: () => Promise<T>,
  retries = 10,
): Promise<T> {
  let latestError: Error;
  for (let i = 0; i < retries; i++) {
    try {
      return await promiseBuilder();
    } catch (e) {
      latestError = e as Error;
      if (i < retries - 1) {
        console.info('retry #', i);
        await new Promise(resolve => setTimeout(resolve, 200 * i));
      }
    }
  }
  throw new Error(
    `retry count exhausted (${retries}), original error ${latestError!}`,
  );
}
