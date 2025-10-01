// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createHash } from '../src/polyfills/crypto';

import { sha256 } from '@noble/hashes/sha256';

describe('Hash Finalization', () => {
  const message = 'Hello World!';

  it('should throw on subsequent digest calls (Node.js parity)', () => {
    const hashInstance = createHash('sha256');
    hashInstance.update(message);

    const digest1 = hashInstance.digest('hex');
    expect(typeof digest1).toBe('string');
    expect(digest1.length).toBe(64); // SHA256 hex is 64 chars

    // Subsequent digest calls should throw
    expect(() => hashInstance.digest('hex')).toThrow(/Digest already called/);
    expect(() => hashInstance.digest()).toThrow(/Digest already called/);

    // Updates should also throw after finalization
    expect(() => hashInstance.update('more data')).toThrow(/Cannot update after calling digest/);
  });

  it('should produce correct hash before finalization', () => {
    const hashInstance = createHash('sha256');
    hashInstance.update(message);

    // Expected result from @noble/hashes
    const expected = sha256(new TextEncoder().encode(message));
    const expectedHex = Array.from(expected)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    // Test hex digest
    const hexResult = hashInstance.digest('hex');
    expect(hexResult).toBe(expectedHex);
  });

  it('should produce correct binary digest before finalization', () => {
    const hashInstance = createHash('sha256');
    hashInstance.update(message);

    // Expected result from @noble/hashes
    const expected = sha256(new TextEncoder().encode(message));

    // Test binary digest
    const binaryResult = hashInstance.digest();
    // Convert to Uint8Array for comparison (handles both Buffer and Uint8Array cases)
    const resultArray = new Uint8Array(binaryResult);

    expect(resultArray).toEqual(expected);
  });
});
