// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CryptoHandler, type SelfCryptoModule } from '../handlers/CryptoHandler';

describe('CryptoHandler', () => {
  let crypto: SelfCryptoModule;
  let handler: CryptoHandler;

  beforeEach(() => {
    crypto = {
      generateKey: vi.fn().mockResolvedValue({ keyRef: 'self.user.signing' }),
      getPublicKey: vi.fn().mockResolvedValue({ publicKey: 'BASE64_PUBLIC_KEY' }),
      sign: vi.fn().mockResolvedValue({ signature: 'BASE64_SIGNATURE' }),
    };
    handler = new CryptoHandler(crypto);
  });

  it('has domain "crypto"', () => {
    expect(handler.domain).toBe('crypto');
  });

  it('generates a key under a valid keyRef', async () => {
    const result = await handler.handle('generateKey', {
      keyRef: 'self.user.signing',
    });

    expect(result).toEqual({ keyRef: 'self.user.signing', success: true });
    expect(crypto.generateKey).toHaveBeenCalledWith('self.user.signing');
  });

  it('returns the public key for an existing keyRef', async () => {
    const result = await handler.handle('getPublicKey', {
      keyRef: 'self.user.signing',
    });
    expect(result).toEqual({ publicKey: 'BASE64_PUBLIC_KEY' });
  });

  it('throws KEY_NOT_FOUND when the public key is empty', async () => {
    (crypto.getPublicKey as ReturnType<typeof vi.fn>).mockResolvedValue({
      publicKey: '',
    });
    await expect(
      handler.handle('getPublicKey', { keyRef: 'self.user.signing' }),
    ).rejects.toMatchObject({ code: 'KEY_NOT_FOUND' });
  });

  it('signs data with a known keyRef', async () => {
    const result = await handler.handle('sign', {
      keyRef: 'self.user.signing',
      data: 'aGVsbG8=',
    });
    expect(result).toEqual({ signature: 'BASE64_SIGNATURE' });
    expect(crypto.sign).toHaveBeenCalledWith('self.user.signing', 'aGVsbG8=');
  });

  it('throws INVALID_PARAMS for empty data', async () => {
    await expect(
      handler.handle('sign', { keyRef: 'self.user.signing', data: '' }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAMS' });
  });

  it('throws INVALID_PARAMS for malformed keyRef', async () => {
    await expect(
      handler.handle('generateKey', { keyRef: 'invalid keyref with spaces' }),
    ).rejects.toMatchObject({ code: 'INVALID_PARAMS' });
  });

  it('throws NOT_AVAILABLE when the native module is missing', async () => {
    const noModule = new CryptoHandler();
    await expect(
      noModule.handle('generateKey', { keyRef: 'self.user.signing' }),
    ).rejects.toMatchObject({ code: 'NOT_AVAILABLE' });
  });

  it('throws METHOD_NOT_FOUND for unknown methods', async () => {
    await expect(handler.handle('encrypt', {})).rejects.toMatchObject({
      code: 'METHOD_NOT_FOUND',
    });
  });
});
