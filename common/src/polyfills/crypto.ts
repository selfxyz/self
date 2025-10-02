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

  let finalized = false;

  return {
    update(data: string | Uint8Array) {
      if (finalized) {
        throw new Error('Cannot update after calling digest(). Hash instance has been finalized.');
      }
      if (typeof data === 'string') {
        hasher.update(new TextEncoder().encode(data));
      } else {
        // Convert Buffer to pure Uint8Array if needed
        // Buffer is a subclass of Uint8Array but noble/hashes expects pure Uint8Array
        const bytes =
          ArrayBuffer.isView(data) &&
          !(data instanceof Uint8Array && data.constructor === Uint8Array)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : data;
        hasher.update(bytes);
      }
      return this;
    },
    digest(encoding?: BufferEncoding) {
      if (finalized) {
        throw new Error('Digest already called. Hash instance has been finalized.');
      }
      finalized = true;
      const result = hasher.digest();

      if (encoding === 'hex') {
        return Array.from(result)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return typeof Buffer !== 'undefined' ? Buffer.from(result) : result;
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

  const keyBytes =
    typeof key === 'string'
      ? new TextEncoder().encode(key)
      : ArrayBuffer.isView(key) && !(key instanceof Uint8Array && key.constructor === Uint8Array)
        ? new Uint8Array(key.buffer, key.byteOffset, key.byteLength)
        : key;
  const hmacState = hmac.create(hashFn, keyBytes);
  let finalized = false;

  return {
    update(data: string | Uint8Array) {
      if (finalized) {
        throw new Error('Cannot update after calling digest(). Hash instance has been finalized.');
      }
      let dataBytes: Uint8Array;
      if (typeof data === 'string') {
        dataBytes = new TextEncoder().encode(data);
      } else {
        // Convert Buffer to pure Uint8Array if needed
        // Buffer is a subclass of Uint8Array but noble/hashes expects pure Uint8Array
        dataBytes =
          ArrayBuffer.isView(data) &&
          !(data instanceof Uint8Array && data.constructor === Uint8Array)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : data;
      }
      hmacState.update(dataBytes);
      return this;
    },
    digest(encoding?: BufferEncoding) {
      if (finalized) {
        throw new Error('Digest already called. Hash instance has been finalized.');
      }
      finalized = true;
      const result = hmacState.digest();

      if (encoding === 'hex') {
        return Array.from(result)
          .map((b: number) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return typeof Buffer !== 'undefined' ? Buffer.from(result) : result;
    },
  };
}

function randomBytes(size: number): Uint8Array | Buffer {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error('randomBytes size must be a positive integer');
  }
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.getRandomValues !== 'function') {
    throw new Error('globalThis.crypto.getRandomValues is not available');
  }
  const out = new Uint8Array(size);
  const MAX = 65536; // WebCrypto limit per call
  for (let offset = 0; offset < size; offset += MAX) {
    cryptoObj.getRandomValues(out.subarray(offset, Math.min(offset + MAX, size)));
  }
  return typeof Buffer !== 'undefined' ? Buffer.from(out) : out;
}

function pbkdf2Sync(
  password: string | Uint8Array,
  salt: string | Uint8Array,
  iterations: number,
  keylen: number,
  digest: string
): Uint8Array | Buffer {
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

  const derivedKey = noblePbkdf2(hashFn, passwordBytes, saltBytes, {
    c: iterations,
    dkLen: keylen,
  });
  return typeof Buffer !== 'undefined' ? Buffer.from(derivedKey) : derivedKey;
}

// Export crypto-like interface
export default {
  createHash,
  createHmac,
  randomBytes,
  pbkdf2Sync,
};

export { createHash, createHmac, pbkdf2Sync, randomBytes };
