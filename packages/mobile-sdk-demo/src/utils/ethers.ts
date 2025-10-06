// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// https://docs.ethers.org/v6/cookbook/react-native/
import { ethers } from 'ethers';

import { hmac } from '@noble/hashes/hmac';
import { pbkdf2 as noblePbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { sha512 as nobleSha512 } from '@noble/hashes/sha512';

function randomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('globalThis.crypto.getRandomValues is not available');
  }
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

function computeHmac(algo: 'sha256' | 'sha512', key: Uint8Array, data: Uint8Array): Uint8Array {
  const hash = algo === 'sha256' ? nobleSha256 : nobleSha512;
  return hmac(hash, key, data);
}

function pbkdf2(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keylen: number,
  algo: 'sha256' | 'sha512',
): Uint8Array {
  const hash = algo === 'sha256' ? nobleSha256 : nobleSha512;
  return noblePbkdf2(hash, password, salt, { c: iterations, dkLen: keylen });
}

function sha256(data: Uint8Array): Uint8Array {
  const result = nobleSha256.create().update(data).digest();
  // Ensure we return a pure Uint8Array, not a Buffer or other subclass
  return result instanceof Uint8Array && result.constructor === Uint8Array ? result : new Uint8Array(result);
}

function sha512(data: Uint8Array): Uint8Array {
  const result = nobleSha512.create().update(data).digest();
  // Ensure we return a pure Uint8Array, not a Buffer or other subclass
  return result instanceof Uint8Array && result.constructor === Uint8Array ? result : new Uint8Array(result);
}

ethers.randomBytes.register(randomBytes);

ethers.computeHmac.register(computeHmac);

ethers.pbkdf2.register(pbkdf2);

ethers.sha256.register(sha256);

ethers.sha512.register(sha512);

export { computeHmac, pbkdf2, randomBytes, sha256, sha512 };
