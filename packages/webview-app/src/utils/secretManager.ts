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

export type StoredSecretSnapshot = {
  mnemonic: string | null;
  secret: string | null;
};

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

// Single lock serializes all secret storage mutations so mnemonic
// and private key can never end up in a mismatched state.
let secretLock: Promise<void> = Promise.resolve();

function withSecretLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = secretLock.then(fn, fn);
  secretLock = next.then(
    () => {},
    () => {},
  );
  return next;
}

async function readStoredSecretSnapshotUnlocked(storage: BridgeStorageAdapter): Promise<StoredSecretSnapshot> {
  const [mnemonic, secret] = await Promise.all([storage.get(MNEMONIC_KEY), storage.get(PRIVATE_KEY_KEY)]);

  return {
    mnemonic,
    secret,
  };
}

export function ensureSecret(storage: BridgeStorageAdapter): Promise<void> {
  return withSecretLock(async () => {
    const existing = await storage.get(PRIVATE_KEY_KEY);
    let mnemonic = await storage.get(MNEMONIC_KEY);

    if (existing) {
      if (!mnemonic) {
        return;
      }

      const derivedPrivateKey = derivePrivateKey(mnemonic);
      if (existing !== derivedPrivateKey) {
        await storage.set(PRIVATE_KEY_KEY, derivedPrivateKey);
      }
      return;
    }

    if (!mnemonic) {
      mnemonic = generateMnemonic(wordlist, 256);
      await storage.set(MNEMONIC_KEY, mnemonic);
    }

    const privateKey = derivePrivateKey(mnemonic);
    await storage.set(PRIVATE_KEY_KEY, privateKey);
  });
}

export async function readStoredSecretSnapshot(storage: BridgeStorageAdapter): Promise<StoredSecretSnapshot> {
  return withSecretLock(() => readStoredSecretSnapshotUnlocked(storage));
}

export function restoreSecretFromMnemonic(
  storage: BridgeStorageAdapter,
  mnemonic: string,
): Promise<{ secret: string }> {
  const secret = derivePrivateKey(mnemonic);

  return withSecretLock(async () => {
    const previousSnapshot = await readStoredSecretSnapshotUnlocked(storage);

    try {
      await storage.set(MNEMONIC_KEY, mnemonic);
      await storage.set(PRIVATE_KEY_KEY, secret);
    } catch (error) {
      await writeSnapshot(storage, previousSnapshot);
      throw error;
    }

    return { secret };
  });
}

export function restoreStoredSecretSnapshot(
  storage: BridgeStorageAdapter,
  snapshot: StoredSecretSnapshot,
): Promise<void> {
  return withSecretLock(async () => {
    const previousSnapshot = await readStoredSecretSnapshotUnlocked(storage);

    try {
      await writeSnapshot(storage, snapshot);
    } catch (error) {
      await writeSnapshot(storage, previousSnapshot);
      throw error;
    }
  });
}

async function writeSnapshot(storage: BridgeStorageAdapter, snapshot: StoredSecretSnapshot): Promise<void> {
  if (snapshot.mnemonic === null) {
    await storage.remove(MNEMONIC_KEY);
  } else {
    await storage.set(MNEMONIC_KEY, snapshot.mnemonic);
  }

  if (snapshot.secret === null) {
    await storage.remove(PRIVATE_KEY_KEY);
  } else {
    await storage.set(PRIVATE_KEY_KEY, snapshot.secret);
  }
}
