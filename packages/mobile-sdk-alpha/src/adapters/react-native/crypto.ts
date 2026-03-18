// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { CryptoAdapter } from '../../types/public';

import { sha256 } from '@noble/hashes/sha256';

/**
 * Creates a {@link CryptoAdapter} using `@noble/hashes` for hashing.
 *
 * Signing is intentionally left unimplemented — it typically involves
 * platform-specific secure enclave access that varies per app.
 */
export function createCryptoAdapter(): CryptoAdapter {
  return {
    async hash(data: Uint8Array): Promise<Uint8Array> {
      return sha256(data);
    },
    async sign(_data: Uint8Array, _keyRef: string): Promise<Uint8Array> {
      throw new Error(
        'Signing is not implemented in the default crypto adapter. ' +
          'Provide a custom CryptoAdapter with a sign implementation for your platform.',
      );
    },

    async generateKey(_keyRef: string): Promise<{ keyRef: string }> {
      throw new Error(
        'Key generation is not implemented in the default crypto adapter. ' +
          'Provide a custom CryptoAdapter with a generateKey implementation for your platform.',
      );
    },

    async getPublicKey(_keyRef: string): Promise<Uint8Array> {
      throw new Error(
        'Public key retrieval is not implemented in the default crypto adapter. ' +
          'Provide a custom CryptoAdapter with a getPublicKey implementation for your platform.',
      );
    },
  };
}
