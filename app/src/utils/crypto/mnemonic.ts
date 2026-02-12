// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';

import { STORAGE_NAME } from '@/services/cloud-backup';
import type { Mnemonic } from '@/types/mnemonic';

/**
 * Gets the recovery phrase warning message based on the current platform.
 * The message mentions cloud backup options available for the OS.
 * @returns The recovery phrase warning message
 */
export function getRecoveryPhraseWarningMessage(): string {
  const cloudBackupName = STORAGE_NAME;
  return `Using this phrase or ${cloudBackupName} backup are the only ways to recover your account. Keep it secret, keep it safe.`;
}

/**
 * Type guard to check if an object is a valid Mnemonic
 * @param obj The object to check
 * @returns True if the object is a valid Mnemonic
 */
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

/**
 * Parses and validates a mnemonic string
 * @param mnemonicString The JSON string to parse
 * @returns The parsed and validated Mnemonic object
 * @throws Error if parsing fails or mnemonic is invalid
 */
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
