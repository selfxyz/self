// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import {
  derivePrivateKey,
  ensureSecret,
  readStoredSecretSnapshot,
  restoreSecretFromMnemonic,
  restoreStoredSecretSnapshot,
} from '../../src/utils/secretManager';

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

describe('readStoredSecretSnapshot', () => {
  it('reads mnemonic and private key under the shared lock', async () => {
    const storageState = new Map<string, string>();
    const firstMnemonicWrite = createDeferred();
    let mnemonicSetCount = 0;

    storageState.set(
      'self_mnemonic',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    storageState.set('self_private_key', derivePrivateKey(storageState.get('self_mnemonic')!));

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

    const nextMnemonic = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
    const restorePromise = restoreSecretFromMnemonic(storage, nextMnemonic);
    const snapshotPromise = readStoredSecretSnapshot(storage);

    await Promise.resolve();
    firstMnemonicWrite.resolve();

    await restorePromise;
    const snapshot = await snapshotPromise;

    expect(snapshot).toEqual({
      mnemonic: nextMnemonic,
      secret: derivePrivateKey(nextMnemonic),
    });
  });
});

describe('restoreStoredSecretSnapshot', () => {
  it('restores the previous snapshot when writing the replacement snapshot fails', async () => {
    const storageState = new Map<string, string>();
    const targetSnapshot = {
      mnemonic: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
      secret: derivePrivateKey('legal winner thank year wave sausage worth useful legal winner thank yellow'),
    };

    storageState.set(
      'self_mnemonic',
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    storageState.set('self_private_key', derivePrivateKey(storageState.get('self_mnemonic')!));

    let failPrivateKeyWrite = true;
    const storage = {
      get: async (key: string) => storageState.get(key) ?? null,
      set: async (key: string, value: string) => {
        storageState.set(key, value);
        if (key === 'self_private_key' && failPrivateKeyWrite) {
          failPrivateKeyWrite = false;
          throw new Error('write failed');
        }
      },
      remove: async (key: string) => {
        storageState.delete(key);
      },
    };

    await expect(restoreStoredSecretSnapshot(storage, targetSnapshot)).rejects.toThrow('write failed');
    expect(storageState.get('self_mnemonic')).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    expect(storageState.get('self_private_key')).toBe(
      derivePrivateKey('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'),
    );
  });

  it('still attempts to restore the private key when mnemonic rollback fails', async () => {
    const storageState = new Map<string, string>();
    const originalMnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const originalSecret = derivePrivateKey(originalMnemonic);
    const targetSnapshot = {
      mnemonic: 'legal winner thank year wave sausage worth useful legal winner thank yellow',
      secret: derivePrivateKey('legal winner thank year wave sausage worth useful legal winner thank yellow'),
    };

    storageState.set('self_mnemonic', originalMnemonic);
    storageState.set('self_private_key', originalSecret);

    let failTargetPrivateKeyWrite = true;
    let failRollbackMnemonicWrite = true;
    const storage = {
      get: async (key: string) => storageState.get(key) ?? null,
      set: async (key: string, value: string) => {
        storageState.set(key, value);
        if (key === 'self_private_key' && failTargetPrivateKeyWrite) {
          failTargetPrivateKeyWrite = false;
          throw new Error('write failed');
        }
        if (key === 'self_mnemonic' && value === originalMnemonic && failRollbackMnemonicWrite) {
          failRollbackMnemonicWrite = false;
          throw new Error('mnemonic rollback failed');
        }
      },
      remove: async (key: string) => {
        storageState.delete(key);
      },
    };

    await expect(restoreStoredSecretSnapshot(storage, targetSnapshot)).rejects.toThrow('write failed');
    expect(storageState.get('self_private_key')).toBe(originalSecret);
  });
});
