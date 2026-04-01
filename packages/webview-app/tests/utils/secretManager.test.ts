// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { derivePrivateKey, ensureSecret, restoreSecretFromMnemonic } from '../../src/utils/secretManager';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('restoreSecretFromMnemonic', () => {
  const storageState = new Map<string, string>();

  beforeEach(() => {
    storageState.clear();
    storageState.set('self_mnemonic', 'seed one');
    storageState.set('self_private_key', 'key one');
  });

  it('serializes concurrent restores so mnemonic and private key stay paired', async () => {
    const firstMnemonicWrite = createDeferred();

    let mnemonicSetCount = 0;
    const storage = {
      get: async (key: string) => storageState.get(key) ?? null,
      set: async (key: string, value: string) => {
        if (key === 'self_mnemonic') {
          mnemonicSetCount += 1;
          if (mnemonicSetCount === 1) {
            storageState.set(key, value);
            await firstMnemonicWrite.promise;
            return;
          }
        }

        storageState.set(key, value);
      },
      remove: async (key: string) => {
        storageState.delete(key);
      },
    };

    const mnemonicA = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const mnemonicB = 'legal winner thank year wave sausage worth useful legal winner thank yellow';

    const restoreA = restoreSecretFromMnemonic(storage, mnemonicA);
    const restoreB = restoreSecretFromMnemonic(storage, mnemonicB);

    await Promise.resolve();
    firstMnemonicWrite.resolve();

    const [resultA, resultB] = await Promise.all([restoreA, restoreB]);

    expect(resultA.secret).toBe(derivePrivateKey(mnemonicA));
    expect(resultB.secret).toBe(derivePrivateKey(mnemonicB));
    expect(storageState.get('self_mnemonic')).toBe(mnemonicB);
    expect(storageState.get('self_private_key')).toBe(derivePrivateKey(mnemonicB));
  });

  it('ensureSecret and restoreSecretFromMnemonic share the same lock', async () => {
    storageState.clear();

    const ops: string[] = [];
    const ensureSetDeferred = createDeferred();

    const storage = {
      get: async (key: string) => storageState.get(key) ?? null,
      set: async (key: string, value: string) => {
        ops.push(`set:${key}`);
        storageState.set(key, value);
        if (key === 'self_mnemonic' && ops.length === 1) {
          await ensureSetDeferred.promise;
        }
      },
      remove: async (key: string) => {
        storageState.delete(key);
      },
    };

    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    const ensurePromise = ensureSecret(storage);
    const restorePromise = restoreSecretFromMnemonic(storage, mnemonic);

    await Promise.resolve();
    ensureSetDeferred.resolve();

    await ensurePromise;
    const result = await restorePromise;

    expect(result.secret).toBe(derivePrivateKey(mnemonic));
    expect(storageState.get('self_mnemonic')).toBe(mnemonic);
    expect(storageState.get('self_private_key')).toBe(derivePrivateKey(mnemonic));
  });
});

describe('ensureSecret', () => {
  const storageState = new Map<string, string>();

  beforeEach(() => {
    storageState.clear();
  });

  it('repairs a stored mnemonic/private key mismatch', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    storageState.set('self_mnemonic', mnemonic);
    storageState.set('self_private_key', '0xdeadbeef');

    const storage = {
      get: async (key: string) => storageState.get(key) ?? null,
      set: async (key: string, value: string) => {
        storageState.set(key, value);
      },
      remove: async (key: string) => {
        storageState.delete(key);
      },
    };

    await ensureSecret(storage);

    expect(storageState.get('self_mnemonic')).toBe(mnemonic);
    expect(storageState.get('self_private_key')).toBe(derivePrivateKey(mnemonic));
  });

  it('preserves an existing private key when mnemonic is missing', async () => {
    storageState.set('self_private_key', '0xexisting');

    const storage = {
      get: async (key: string) => storageState.get(key) ?? null,
      set: async (key: string, value: string) => {
        storageState.set(key, value);
      },
      remove: async (key: string) => {
        storageState.delete(key);
      },
    };

    await ensureSecret(storage);

    expect(storageState.get('self_mnemonic')).toBeUndefined();
    expect(storageState.get('self_private_key')).toBe('0xexisting');
  });
});
