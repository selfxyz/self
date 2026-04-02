// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeStorageAdapter } from '@selfxyz/webview-bridge/adapters';

import { HDKey } from '@scure/bip32';
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

const MNEMONIC_KEY = 'self_mnemonic';
const PRIVATE_KEY_KEY = 'self_private_key';
const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0/0";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function derivePrivateKey(mnemonic: string, path = DEFAULT_DERIVATION_PATH): string {
  const seed = mnemonicToSeedSync(mnemonic);
  const hd = HDKey.fromMasterSeed(seed);
  const derived = hd.derive(path);
  if (!derived.privateKey) throw new Error('Failed to derive private key');
  return '0x' + bytesToHex(derived.privateKey);
}

let ensureSecretInFlight: Promise<void> | null = null;

export async function ensureSecret(storage: BridgeStorageAdapter): Promise<void> {
  if (ensureSecretInFlight) {
    await ensureSecretInFlight;
    return ensureSecret(storage);
  }

  ensureSecretInFlight = (async () => {
    const existing = await storage.get(PRIVATE_KEY_KEY);
    if (existing) return;

    let mnemonic = await storage.get(MNEMONIC_KEY);
    if (!mnemonic) {
      mnemonic = generateMnemonic(wordlist, 256);
      await storage.set(MNEMONIC_KEY, mnemonic);
    }

    const privateKey = derivePrivateKey(mnemonic);
    await storage.set(PRIVATE_KEY_KEY, privateKey);
  })().finally(() => {
    ensureSecretInFlight = null;
  });

  return ensureSecretInFlight;
}
