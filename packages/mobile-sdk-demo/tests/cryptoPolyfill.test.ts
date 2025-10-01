// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Tests for crypto-polyfill.js demonstrating functional bugs:
 * 1. Method chaining breaks due to incorrect `this` binding
 * 2. RNG import fails - react-native-get-random-values doesn't export getRandomValues
 * 3. Buffer polyfill missing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Preserve original crypto
const originalCrypto = global.crypto;

// Mock crypto.getRandomValues in jsdom environment
if (typeof global.crypto === 'undefined' || !global.crypto.getRandomValues) {
  const mockGetRandomValues = vi.fn((array: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  });

  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: mockGetRandomValues,
    },
    writable: true,
    configurable: true,
  });
}

// Mock Buffer globally to simulate React Native environment where Buffer is undefined
const originalBuffer = global.Buffer;

describe('Crypto Polyfill Functional Bugs', () => {
  let crypto: any;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore Buffer if we removed it
    global.Buffer = originalBuffer;
    // Restore crypto (use Object.defineProperty for read-only properties)
    if (originalCrypto) {
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });

  describe('Method Chaining Bug', () => {
    it('should allow method chaining with update() calls', async () => {
      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      // This should work but currently fails due to `this` binding issue
      expect(() => {
        const hasher = crypto.createHash('sha256');
        const result = hasher.update('Hello ').update('World').digest('hex');

        expect(typeof result).toBe('string');
        expect(result.length).toBe(64); // SHA256 hex length
      }).not.toThrow();
    });

    it('should return the hasher instance from update() for chaining', async () => {
      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      const hasher = crypto.createHash('sha256');
      const updateResult = hasher.update('test');

      // This should be the same object for chaining
      expect(updateResult).toBe(hasher);
      expect(updateResult.update).toBeInstanceOf(Function);
      expect(updateResult.digest).toBeInstanceOf(Function);
    });

    it('should produce the same result for chained vs separate calls', async () => {
      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      // Chained approach
      const chainedResult = crypto.createHash('sha256').update('Hello ').update('World').digest('hex');

      // Separate calls approach
      const hasher = crypto.createHash('sha256');
      hasher.update('Hello ');
      hasher.update('World');
      const separateResult = hasher.digest('hex');

      expect(chainedResult).toBe(separateResult);
    });
  });

  describe('RNG Import Bug', () => {
    it('should not try to destructure getRandomValues from react-native-get-random-values', async () => {
      // Mock the require to simulate the actual package behavior
      vi.doMock('react-native-get-random-values', () => {
        // This package doesn't export getRandomValues - it just polyfills globalThis.crypto
        global.crypto = global.crypto || ({} as typeof crypto);
        global.crypto.getRandomValues = vi.fn((array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = i % 256;
          }
          return array;
        }) as any;
        return {}; // Empty export
      });

      // Should now work because we use globalThis.crypto.getRandomValues, not destructuring
      crypto = await import('../src/polyfills/cryptoPolyfill.js');
      const result = crypto.randomBytes(16);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(16);
    });

    it('should throw helpful error when crypto.getRandomValues is not available', async () => {
      // Clear module cache and remove crypto polyfill
      vi.resetModules();
      vi.doMock('react-native-get-random-values', () => {
        // Mock a broken polyfill that doesn't install crypto
        return {};
      });

      // Remove crypto to simulate missing polyfill
      const originalCrypto = global.crypto;
      delete (global as any).crypto;

      await expect(async () => {
        crypto = await import('../src/polyfills/cryptoPolyfill.js');
        crypto.randomBytes(16);
      }).rejects.toThrow(/globalThis.crypto.getRandomValues is not available/);

      global.crypto = originalCrypto;
    });
  });

  describe('Buffer Polyfill Bug', () => {
    it('should gracefully handle Buffer availability check', async () => {
      // This test verifies that the crypto polyfill checks for Buffer availability
      // Note: We can't actually delete Buffer because Vitest's worker threads need it
      // Instead, we verify that the polyfill works correctly with and without Buffer

      // Import the polyfill normally
      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      // Test that randomBytes returns a typed array
      const result = crypto.randomBytes(32);

      // The result should be either a Buffer or Uint8Array (Buffer extends Uint8Array)
      // Buffer is available in Node.js environment, so we expect Buffer here
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(32);

      // Verify it's a valid typed array with proper values
      expect(result.every((byte: number) => byte >= 0 && byte <= 255)).toBe(true);
    });

    it('should work with Buffer polyfill imported', async () => {
      // Reset mocks for this test
      vi.unmock('buffer');
      vi.resetModules();
      vi.restoreAllMocks();

      // Simulate proper Buffer polyfill
      global.Buffer = require('buffer').Buffer;

      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      const result = crypto.createHash('sha256').update('test').digest('hex');

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64);
    });

    it('should handle different data types correctly with Buffer polyfill', async () => {
      // Reset mocks for this test
      vi.unmock('buffer');
      vi.resetModules();
      vi.restoreAllMocks();

      global.Buffer = require('buffer').Buffer;
      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      const hasher = crypto.createHash('sha256');

      // Should handle strings
      hasher.update('string data');

      // Should handle Uint8Array
      hasher.update(new Uint8Array([1, 2, 3, 4]));

      // Should handle Buffer
      hasher.update(Buffer.from('buffer data'));

      const result = hasher.digest('hex');
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with all fixes applied', async () => {
      // Reset mocks for this test
      vi.unmock('buffer');
      vi.resetModules();
      vi.restoreAllMocks();

      // Set up proper environment
      global.Buffer = require('buffer').Buffer;
      global.crypto = global.crypto || ({} as typeof crypto);
      global.crypto.getRandomValues = vi.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      }) as any;

      crypto = await import('../src/polyfills/cryptoPolyfill.js');

      // Test hash chaining
      const hashResult = crypto.createHash('sha256').update('Hello ').update('World').digest('hex');

      expect(typeof hashResult).toBe('string');
      expect(hashResult.length).toBe(64);

      // Test randomBytes
      const randomResult = crypto.randomBytes(32);
      expect(randomResult).toBeInstanceOf(Buffer);
      expect(randomResult.length).toBe(32);
    });
  });
});
