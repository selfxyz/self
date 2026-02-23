// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { CryptoAdapter } from '../../types/public';

/**
 * Normalizes algorithm names to the Web Crypto API format.
 * e.g. "sha256" → "SHA-256", "SHA256" → "SHA-256", "sha-256" → "SHA-256"
 */
function normalizeAlgo(algo: string): string {
  return algo.toUpperCase().replace(/^SHA(\d)/, 'SHA-$1');
}

/**
 * Creates a partial {@link CryptoAdapter} backed by the Web Crypto API.
 *
 * - `hash()` uses `crypto.subtle.digest`.
 * - `sign()` is **not** implemented — signing requires native keychain access
 *   via the bridge and cannot be done in pure browser JS.
 */
export function createWebCryptoAdapter(): CryptoAdapter {
  return {
    async hash(input: Uint8Array, algo: 'sha256' = 'sha256'): Promise<Uint8Array> {
      const webCryptoAlgo = normalizeAlgo(algo);
      const digest = await crypto.subtle.digest(webCryptoAlgo, input as Uint8Array<ArrayBuffer>);
      return new Uint8Array(digest);
    },

    async sign(_data: Uint8Array, _keyRef: string): Promise<Uint8Array> {
      throw new Error(
        'Signing is not implemented in the browser crypto adapter. ' +
          'Signing requires native keychain access via the bridge.',
      );
    },
  };
}
