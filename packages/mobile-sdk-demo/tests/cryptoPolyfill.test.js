// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Tests for crypto-polyfill.js demonstrating functional bugs:
 * 1. Method chaining breaks due to incorrect `this` binding
 * 2. RNG import fails - react-native-get-random-values doesn't export getRandomValues
 * 3. Buffer polyfill missing
 */

// Preserve and mock globalThis.crypto before importing
const originalCrypto = global.crypto;
global.crypto = global.crypto || {};
global.crypto.getRandomValues =
  global.crypto.getRandomValues ||
  jest.fn(array => {
    // Fill with predictable values for testing
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256;
    }
    return array;
  });

// Mock Buffer globally to simulate React Native environment where Buffer is undefined
const originalBuffer = global.Buffer;

describe('Crypto Polyfill Functional Bugs', () => {
  let crypto;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore Buffer if we removed it
    global.Buffer = originalBuffer;
    // Restore crypto
    global.crypto = originalCrypto;
  });

  describe('Method Chaining Bug', () => {
    it('should allow method chaining with update() calls', () => {
      crypto = require('../crypto-polyfill.js');

      // This should work but currently fails due to `this` binding issue
      expect(() => {
        const hasher = crypto.createHash('sha256');
        const result = hasher.update('Hello ').update('World').digest('hex');

        expect(typeof result).toBe('string');
        expect(result.length).toBe(64); // SHA256 hex length
      }).not.toThrow();
    });

    it('should return the hasher instance from update() for chaining', () => {
      crypto = require('../crypto-polyfill.js');

      const hasher = crypto.createHash('sha256');
      const updateResult = hasher.update('test');

      // This should be the same object for chaining
      expect(updateResult).toBe(hasher);
      expect(updateResult.update).toBeInstanceOf(Function);
      expect(updateResult.digest).toBeInstanceOf(Function);
    });

    it('should produce the same result for chained vs separate calls', () => {
      crypto = require('../crypto-polyfill.js');

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
    it('should not try to destructure getRandomValues from react-native-get-random-values', () => {
      // Mock the require to simulate the actual package behavior
      jest.doMock('react-native-get-random-values', () => {
        // This package doesn't export getRandomValues - it just polyfills globalThis.crypto
        global.crypto = global.crypto || {};
        global.crypto.getRandomValues = jest.fn(array => {
          for (let i = 0; i < array.length; i++) {
            array[i] = i % 256;
          }
          return array;
        });
        return {}; // Empty export
      });

      // Should now work because we use globalThis.crypto.getRandomValues, not destructuring
      expect(() => {
        crypto = require('../crypto-polyfill.js');
        const result = crypto.randomBytes(16);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(16);
      }).not.toThrow();
    });

    it('should use globalThis.crypto.getRandomValues after polyfill import', () => {
      // Mock proper polyfill behavior
      jest.doMock('react-native-get-random-values', () => {
        // Side effect: install polyfill
        global.crypto = global.crypto || {};
        global.crypto.getRandomValues = jest.fn(array => {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
          }
          return array;
        });
        return {}; // No exports
      });

      // Should work after proper implementation
      crypto = require('../crypto-polyfill.js');
      const result = crypto.randomBytes(16);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(16);
      expect(global.crypto.getRandomValues).toHaveBeenCalled();
    });

    it('should throw helpful error when crypto.getRandomValues is not available', () => {
      // Clear module cache and remove crypto polyfill
      jest.resetModules();
      jest.doMock('react-native-get-random-values', () => {
        // Mock a broken polyfill that doesn't install crypto
        return {};
      });

      // Remove crypto to simulate missing polyfill
      const originalCrypto = global.crypto;
      delete global.crypto;

      expect(() => {
        crypto = require('../crypto-polyfill.js');
        crypto.randomBytes(16);
      }).toThrow(/crypto.getRandomValues not available/);

      global.crypto = originalCrypto;
    });
  });

  describe('Buffer Polyfill Bug', () => {
    it('should handle missing Buffer in React Native environment', () => {
      // Simulate React Native where Buffer is undefined
      jest.resetModules();
      const originalBuffer = global.Buffer;
      delete global.Buffer;

      // Mock the buffer module to throw when imported
      jest.doMock('buffer', () => {
        throw new Error('Buffer polyfill not available');
      });

      expect(() => {
        crypto = require('../crypto-polyfill.js');
      }).toThrow(/Buffer polyfill not available/);

      // Clean up mocks
      jest.unmock('buffer');
      jest.resetModules();
      global.Buffer = originalBuffer;
    });

    it('should work with Buffer polyfill imported', () => {
      // Reset mocks for this test
      jest.unmock('buffer');
      jest.resetModules();
      jest.restoreAllMocks();

      // Simulate proper Buffer polyfill
      global.Buffer = require('buffer').Buffer;

      crypto = require('../crypto-polyfill.js');

      const result = crypto.createHash('sha256').update('test').digest('hex');

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64);
    });

    it('should handle different data types correctly with Buffer polyfill', () => {
      // Reset mocks for this test
      jest.unmock('buffer');
      jest.resetModules();
      jest.restoreAllMocks();

      global.Buffer = require('buffer').Buffer;
      crypto = require('../crypto-polyfill.js');

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
    it('should work end-to-end with all fixes applied', () => {
      // Reset mocks for this test
      jest.unmock('buffer');
      jest.resetModules();
      jest.restoreAllMocks();

      // Set up proper environment
      global.Buffer = require('buffer').Buffer;
      global.crypto = global.crypto || {};
      global.crypto.getRandomValues = jest.fn(array => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i % 256;
        }
        return array;
      });

      crypto = require('../crypto-polyfill.js');

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
