// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect } from 'vitest';

import { createWebCryptoAdapter } from '../../../src/adapters/browser/crypto';

describe('createWebCryptoAdapter', () => {
  const adapter = createWebCryptoAdapter();

  it('should hash data using SHA-256', async () => {
    const input = new TextEncoder().encode('hello');
    const hash = await adapter.hash(input, 'sha256');

    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);

    // SHA-256 of "hello" is deterministic
    const hash2 = await adapter.hash(input, 'sha256');
    expect(hash).toEqual(hash2);
  });

  it('should default to sha256 when no algo specified', async () => {
    const input = new TextEncoder().encode('test');
    const hashExplicit = await adapter.hash(input, 'sha256');
    const hashDefault = await adapter.hash(input);
    expect(hashExplicit).toEqual(hashDefault);
  });

  it('should handle already-hyphenated algo input (sha-256)', async () => {
    const input = new TextEncoder().encode('test');
    const hashHyphenated = await adapter.hash(input, 'sha-256' as any);
    const hashDefault = await adapter.hash(input, 'sha256');
    expect(hashHyphenated).toEqual(hashDefault);
  });

  it('should handle uppercase no-hyphen algo input (SHA256)', async () => {
    const input = new TextEncoder().encode('test');
    const hashUpper = await adapter.hash(input, 'SHA256' as any);
    const hashDefault = await adapter.hash(input, 'sha256');
    expect(hashUpper).toEqual(hashDefault);
  });

  it('should throw on sign (not implemented)', async () => {
    await expect(adapter.sign(new Uint8Array([1, 2, 3]), 'key-ref')).rejects.toThrow(
      'Signing is not implemented',
    );
  });
});
