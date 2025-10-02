// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createHmac } from '../src/polyfills/crypto';

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';

describe('HMAC Streaming', () => {
  const key = 'test-key';
  const message1 = 'Hello ';
  const message2 = 'World!';
  const fullMessage = message1 + message2;

  it('should produce the same result for single vs multiple update calls', () => {
    // Expected result: compute HMAC of full message in one go
    const expected = hmac(
      sha256,
      new TextEncoder().encode(key),
      new TextEncoder().encode(fullMessage)
    );
    const expectedHex = Array.from(expected)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');

    // Single update call
    const hmacSingle = createHmac('sha256', key);
    hmacSingle.update(fullMessage);
    const singleResult = hmacSingle.digest('hex');

    // Multiple update calls (this should be equivalent but currently fails)
    const hmacMultiple = createHmac('sha256', key);
    hmacMultiple.update(message1);
    hmacMultiple.update(message2);
    const multipleResult = hmacMultiple.digest('hex');

    // These should all be equal
    expect(singleResult).toBe(expectedHex);
    expect(multipleResult).toBe(expectedHex);
    expect(singleResult).toBe(multipleResult);
  });

  it('should handle binary data correctly with streaming', () => {
    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5, 6]);
    const fullData = new Uint8Array([1, 2, 3, 4, 5, 6]);

    // Expected result
    const expected = hmac(sha256, new TextEncoder().encode(key), fullData);

    // Single update
    const hmacSingle = createHmac('sha256', key);
    hmacSingle.update(fullData);
    const singleResult = hmacSingle.digest();

    // Multiple updates
    const hmacMultiple = createHmac('sha256', key);
    hmacMultiple.update(chunk1);
    hmacMultiple.update(chunk2);
    const multipleResult = hmacMultiple.digest();

    // Convert to Uint8Array for comparison (handles both Buffer and Uint8Array cases)
    const singleArray = new Uint8Array(singleResult);
    const multipleArray = new Uint8Array(multipleResult);

    expect(singleArray).toEqual(expected);
    expect(multipleArray).toEqual(expected);
    expect(singleArray).toEqual(multipleArray);
  });

  it('should throw on subsequent digest calls (Node.js parity)', () => {
    const hmacInstance = createHmac('sha256', key);
    hmacInstance.update(fullMessage);

    const digest1 = hmacInstance.digest('hex');
    expect(typeof digest1).toBe('string');
    expect(digest1.length).toBe(64); // SHA256 hex is 64 chars

    // Subsequent digest calls should throw
    expect(() => hmacInstance.digest('hex')).toThrow();
    expect(() => hmacInstance.digest()).toThrow();

    // Updates should also throw after finalization
    expect(() => hmacInstance.update('more data')).toThrow();
  });
});
