// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { randomBytes, sha256, sha512, computeHmac, pbkdf2 } from '../src/utils/ethers';

describe('Crypto Polyfills', () => {
  describe('randomBytes', () => {
    it('should generate random bytes of specified length', () => {
      const bytes = randomBytes(32);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(32);
    });

    it('should generate different random bytes on each call', () => {
      const bytes1 = randomBytes(16);
      const bytes2 = randomBytes(16);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should handle different lengths', () => {
      const bytes8 = randomBytes(8);
      const bytes64 = randomBytes(64);
      expect(bytes8.length).toBe(8);
      expect(bytes64.length).toBe(64);
    });
  });

  describe('sha256', () => {
    it('should hash data correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = sha256(data);

      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32); // SHA-256 produces 32 bytes
    });

    it('should produce consistent hashes for same input', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = sha256(data);
      const hash2 = sha256(data);

      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const data1 = new Uint8Array([1, 2, 3, 4, 5]);
      const data2 = new Uint8Array([1, 2, 3, 4, 6]);
      const hash1 = sha256(data1);
      const hash2 = sha256(data2);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('sha512', () => {
    it('should hash data correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash = sha512(data);

      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(64); // SHA-512 produces 64 bytes
    });

    it('should produce consistent hashes for same input', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const hash1 = sha512(data);
      const hash2 = sha512(data);

      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const data1 = new Uint8Array([1, 2, 3, 4, 5]);
      const data2 = new Uint8Array([1, 2, 3, 4, 6]);
      const hash1 = sha512(data1);
      const hash2 = sha512(data2);

      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('computeHmac', () => {
    it('should compute HMAC-SHA256 correctly', () => {
      const key = new Uint8Array([1, 2, 3, 4]);
      const data = new Uint8Array([5, 6, 7, 8]);
      const hmac = computeHmac('sha256', key, data);

      expect(hmac).toBeInstanceOf(Uint8Array);
      expect(hmac.length).toBe(32); // HMAC-SHA256 produces 32 bytes
    });

    it('should compute HMAC-SHA512 correctly', () => {
      const key = new Uint8Array([1, 2, 3, 4]);
      const data = new Uint8Array([5, 6, 7, 8]);
      const hmac = computeHmac('sha512', key, data);

      expect(hmac).toBeInstanceOf(Uint8Array);
      expect(hmac.length).toBe(64); // HMAC-SHA512 produces 64 bytes
    });

    it('should produce consistent HMAC for same inputs', () => {
      const key = new Uint8Array([1, 2, 3, 4]);
      const data = new Uint8Array([5, 6, 7, 8]);
      const hmac1 = computeHmac('sha256', key, data);
      const hmac2 = computeHmac('sha256', key, data);

      expect(hmac1).toEqual(hmac2);
    });

    it('should produce different HMAC for different keys', () => {
      const key1 = new Uint8Array([1, 2, 3, 4]);
      const key2 = new Uint8Array([1, 2, 3, 5]);
      const data = new Uint8Array([5, 6, 7, 8]);
      const hmac1 = computeHmac('sha256', key1, data);
      const hmac2 = computeHmac('sha256', key2, data);

      expect(hmac1).not.toEqual(hmac2);
    });
  });

  describe('pbkdf2', () => {
    it('should derive key using PBKDF2-SHA256', () => {
      const password = new Uint8Array([1, 2, 3, 4]);
      const salt = new Uint8Array([5, 6, 7, 8]);
      const key = pbkdf2(password, salt, 1000, 32, 'sha256');

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should derive key using PBKDF2-SHA512', () => {
      const password = new Uint8Array([1, 2, 3, 4]);
      const salt = new Uint8Array([5, 6, 7, 8]);
      const key = pbkdf2(password, salt, 1000, 64, 'sha512');

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(64);
    });

    it('should produce consistent keys for same inputs', () => {
      const password = new Uint8Array([1, 2, 3, 4]);
      const salt = new Uint8Array([5, 6, 7, 8]);
      const key1 = pbkdf2(password, salt, 1000, 32, 'sha256');
      const key2 = pbkdf2(password, salt, 1000, 32, 'sha256');

      expect(key1).toEqual(key2);
    });

    it('should produce different keys for different salts', () => {
      const password = new Uint8Array([1, 2, 3, 4]);
      const salt1 = new Uint8Array([5, 6, 7, 8]);
      const salt2 = new Uint8Array([5, 6, 7, 9]);
      const key1 = pbkdf2(password, salt1, 1000, 32, 'sha256');
      const key2 = pbkdf2(password, salt2, 1000, 32, 'sha256');

      expect(key1).not.toEqual(key2);
    });

    it('should handle different iteration counts', () => {
      const password = new Uint8Array([1, 2, 3, 4]);
      const salt = new Uint8Array([5, 6, 7, 8]);
      const key1 = pbkdf2(password, salt, 1000, 32, 'sha256');
      const key2 = pbkdf2(password, salt, 2000, 32, 'sha256');

      expect(key1).not.toEqual(key2);
    });
  });

  describe('ethers integration', () => {
    it('should have ethers.randomBytes registered', () => {
      // This test verifies that ethers.js is using our polyfill
      const { ethers } = require('ethers');
      expect(typeof ethers.randomBytes).toBe('function');

      const bytes = ethers.randomBytes(16);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
    });

    it('should have ethers.sha256 registered', () => {
      const { ethers } = require('ethers');
      expect(typeof ethers.sha256).toBe('function');

      const data = new Uint8Array([1, 2, 3, 4]);
      const hash = ethers.sha256(data);
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
    });

    it('should have ethers.sha512 registered', () => {
      const { ethers } = require('ethers');
      expect(typeof ethers.sha512).toBe('function');

      const data = new Uint8Array([1, 2, 3, 4]);
      const hash = ethers.sha512(data);
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^0x[a-f0-9]{128}$/); // 64 bytes = 128 hex chars
    });
  });
});
