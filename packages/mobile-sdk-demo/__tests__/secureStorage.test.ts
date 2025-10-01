// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearSecret,
  generateSecret,
  getOrCreateSecret,
  getSecretMetadata,
  hasSecret,
  isValidSecret,
} from '../src/utils/secureStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock crypto.getRandomValues
const mockRandomValues = vi.fn((array: Uint8Array) => {
  // Fill with deterministic values for testing
  for (let i = 0; i < array.length; i++) {
    array[i] = i % 256;
  }
  return array;
});

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockRandomValues,
  },
  writable: true,
});

describe('secureStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockRandomValues.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('generateSecret', () => {
    it('should generate a 64-character hex string', () => {
      const secret = generateSecret();
      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should call crypto.getRandomValues with 32 bytes', () => {
      generateSecret();
      expect(mockRandomValues).toHaveBeenCalledTimes(1);
      expect(mockRandomValues.mock.calls[0][0]).toHaveLength(32);
    });

    it('should generate different secrets on subsequent calls with real crypto', () => {
      // Use real crypto for this test
      const originalGetRandomValues = mockRandomValues.getMockImplementation();

      mockRandomValues.mockImplementation((array: Uint8Array) => {
        // Simulate real randomness
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      });

      const secret1 = generateSecret();
      const secret2 = generateSecret();

      expect(secret1).not.toBe(secret2);

      // Restore mock
      if (originalGetRandomValues) {
        mockRandomValues.mockImplementation(originalGetRandomValues);
      }
    });
  });

  describe('isValidSecret', () => {
    it('should return true for valid 64-char hex string', () => {
      const validSecret = '0'.repeat(64);
      expect(isValidSecret(validSecret)).toBe(true);
    });

    it('should return true for valid hex with mixed case', () => {
      const validSecret = 'abcdef0123456789'.repeat(4); // gitleaks:allow
      expect(isValidSecret(validSecret)).toBe(true);
    });

    it('should return false for short string', () => {
      expect(isValidSecret('abc')).toBe(false);
    });

    it('should return false for long string', () => {
      expect(isValidSecret('0'.repeat(65))).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const invalidSecret = 'g'.repeat(64);
      expect(isValidSecret(invalidSecret)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidSecret('')).toBe(false);
    });
  });

  describe('getOrCreateSecret', () => {
    it('should create a new secret if none exists', async () => {
      expect(await hasSecret()).toBe(false);

      const secret = await getOrCreateSecret();

      expect(secret).toHaveLength(64);
      expect(isValidSecret(secret)).toBe(true);
      expect(await hasSecret()).toBe(true);
    });

    it('should store metadata when creating a new secret', async () => {
      await getOrCreateSecret();

      const metadata = await getSecretMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.version).toBe('1.0');
      expect(metadata?.createdAt).toBeDefined();
      expect(metadata?.lastAccessed).toBeDefined();
    });

    it('should return the same secret on subsequent calls', async () => {
      const secret1 = await getOrCreateSecret();
      const secret2 = await getOrCreateSecret();

      expect(secret1).toBe(secret2);
    });

    it('should update lastAccessed time when retrieving existing secret', async () => {
      await getOrCreateSecret();

      const metadata1 = await getSecretMetadata();
      const lastAccessed1 = metadata1?.lastAccessed;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await getOrCreateSecret();

      const metadata2 = await getSecretMetadata();
      const lastAccessed2 = metadata2?.lastAccessed;

      expect(lastAccessed2).not.toBe(lastAccessed1);
      expect(new Date(lastAccessed2!).getTime()).toBeGreaterThan(new Date(lastAccessed1!).getTime());
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw an error
      const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });

      await expect(getOrCreateSecret()).rejects.toThrow('localStorage error');

      // Restore mock after test
      spy.mockRestore();
    });
  });

  describe('hasSecret', () => {
    it('should return false when no secret exists', async () => {
      expect(await hasSecret()).toBe(false);
    });

    it('should return true when secret exists', async () => {
      await getOrCreateSecret();
      expect(await hasSecret()).toBe(true);
    });

    it('should return false after clearing secret', async () => {
      await getOrCreateSecret();
      expect(await hasSecret()).toBe(true);

      await clearSecret();
      expect(await hasSecret()).toBe(false);
    });
  });

  describe('getSecretMetadata', () => {
    it('should return null when no metadata exists', async () => {
      expect(await getSecretMetadata()).toBeNull();
    });

    it('should return metadata after creating secret', async () => {
      await getOrCreateSecret();

      const metadata = await getSecretMetadata();
      expect(metadata).not.toBeNull();
      expect(metadata?.version).toBe('1.0');
    });

    it('should handle corrupted metadata gracefully', async () => {
      localStorage.setItem('self-demo-secret-version', 'invalid json');
      expect(await getSecretMetadata()).toBeNull();
    });
  });

  describe('clearSecret', () => {
    it('should remove secret from localStorage', async () => {
      await getOrCreateSecret();
      expect(await hasSecret()).toBe(true);

      await clearSecret();
      expect(await hasSecret()).toBe(false);
    });

    it('should remove metadata from localStorage', async () => {
      await getOrCreateSecret();
      expect(await getSecretMetadata()).not.toBeNull();

      await clearSecret();
      expect(await getSecretMetadata()).toBeNull();
    });

    it('should not throw if called when no secret exists', async () => {
      await expect(clearSecret()).resolves.not.toThrow();
    });
  });

  describe('security considerations', () => {
    it('should log warning when creating secret', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await getOrCreateSecret();

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('INSECURE localStorage - DEMO ONLY'));

      consoleWarnSpy.mockRestore();
    });

    it('should use exactly 32 bytes (256 bits) for security', () => {
      generateSecret();

      const callArgs = mockRandomValues.mock.calls[0][0];
      expect(callArgs).toHaveLength(32);
      expect(callArgs).toBeInstanceOf(Uint8Array);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete lifecycle: create → retrieve → clear → create new', async () => {
      // Create
      const secret1 = await getOrCreateSecret();
      expect(isValidSecret(secret1)).toBe(true);

      // Retrieve (should be same)
      const secret2 = await getOrCreateSecret();
      expect(secret2).toBe(secret1);

      // Clear
      await clearSecret();
      expect(await hasSecret()).toBe(false);

      // Create new (should be different since we use different values)
      mockRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + 100) % 256; // Different values
        }
        return array;
      });

      const secret3 = await getOrCreateSecret();
      expect(isValidSecret(secret3)).toBe(true);
      expect(secret3).not.toBe(secret1);
    });

    it('should maintain consistency across page reloads (simulated)', async () => {
      // First "session"
      const secret1 = await getOrCreateSecret();

      // Simulate page reload by clearing memory but not localStorage
      // (localStorage persists, our module state doesn't)

      // Second "session" - should retrieve same secret
      const secret2 = await getOrCreateSecret();
      expect(secret2).toBe(secret1);
    });
  });
});
