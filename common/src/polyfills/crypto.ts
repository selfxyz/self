// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Crypto polyfill using @noble/hashes for web builds
 * This replaces crypto-browserify with a more modern and secure implementation
 */

import { hmac } from '@noble/hashes/hmac';
import { md5 as nobleMd5 } from '@noble/hashes/legacy';
import { pbkdf2 as noblePbkdf2 } from '@noble/hashes/pbkdf2';
import { sha1 as nobleSha1 } from '@noble/hashes/sha1';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';

// Create hash instances that mimic Node.js crypto API
function createHash(algorithm: string) {
  const alg = algorithm.toLowerCase();

  let hasher: any;

  switch (alg) {
    case 'sha1':
      hasher = nobleSha1.create();
      break;
    case 'sha256':
      hasher = nobleSha256.create();
      break;
    case 'sha512':
      hasher = nobleSha512.create();
      break;
    case 'md5':
      hasher = nobleMd5.create();
      break;
    default:
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  return {
    update(data: string | Uint8Array) {
      if (typeof data === 'string') {
        hasher.update(new TextEncoder().encode(data));
      } else {
        hasher.update(data);
      }
      return this;
    },
    digest(encoding?: string) {
      const result = hasher.digest();
      if (encoding === 'hex') {
        return Array.from(result)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return result;
    },
  };
}

function createHmac(algorithm: string, key: string | Uint8Array) {
  const alg = algorithm.toLowerCase();

  let hashFn: any;

  switch (alg) {
    case 'sha1':
      hashFn = nobleSha1;
      break;
    case 'sha256':
      hashFn = nobleSha256;
      break;
    case 'sha512':
      hashFn = nobleSha512;
      break;
    default:
      throw new Error(`Unsupported HMAC algorithm: ${algorithm}`);
  }

  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;

  return {
    update(data: string | Uint8Array) {
      const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      this._result = hmac(hashFn, keyBytes, dataBytes);
      return this;
    },
    digest(encoding?: string) {
      if (!this._result) {
        throw new Error('Cannot digest without update');
      }
      if (encoding === 'hex') {
        return Array.from(this._result)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return this._result;
    },
    _result: null as Uint8Array | null,
  };
}

function randomBytes(size: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('globalThis.crypto.getRandomValues is not available');
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(size));
}

function pbkdf2Sync(
  password: string | Uint8Array,
  salt: string | Uint8Array,
  iterations: number,
  keylen: number,
  digest: string
): Uint8Array {
  const passwordBytes =
    typeof password === 'string' ? new TextEncoder().encode(password) : password;
  const saltBytes = typeof salt === 'string' ? new TextEncoder().encode(salt) : salt;

  let hashFn: any;
  switch (digest.toLowerCase()) {
    case 'sha1':
      hashFn = nobleSha1;
      break;
    case 'sha256':
      hashFn = nobleSha256;
      break;
    case 'sha512':
      hashFn = nobleSha512;
      break;
    default:
      throw new Error(`Unsupported PBKDF2 digest: ${digest}`);
  }

  return noblePbkdf2(hashFn, passwordBytes, saltBytes, {
    c: iterations,
    dkLen: keylen,
  });
}

// Export crypto-like interface
export default {
  createHash,
  createHmac,
  randomBytes,
  pbkdf2Sync,
};

export { createHash, createHmac, pbkdf2Sync, randomBytes };
