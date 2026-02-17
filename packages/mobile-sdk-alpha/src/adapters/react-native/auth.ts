// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AuthAdapter } from '../../types/public';

const DEFAULT_KEYCHAIN_SERVICE = 'com.self.sdk.secret';

/**
 * Generates a cryptographically secure random 32-byte hex string.
 * Requires `react-native-get-random-values` polyfill to be imported before use.
 */
function generateSecret(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Creates a Keychain-backed {@link AuthAdapter} for React Native.
 *
 * On iOS/Android it uses `react-native-keychain` (hardware-backed Keystore /
 * Keychain). On web it falls back to an in-memory store suitable for
 * development only.
 *
 * Requires `react-native-keychain` and `react-native-get-random-values` as
 * peer dependencies.
 *
 * @param opts.keychainService - Keychain service identifier (default `com.self.sdk.secret`).
 */
export function createAuthAdapter(opts?: { keychainService?: string }): AuthAdapter {
  const service = opts?.keychainService ?? DEFAULT_KEYCHAIN_SERVICE;

  // Web/testing fallback — secrets live only in memory.
  const memoryStore = new Map<string, string>();

  return {
    async getPrivateKey(): Promise<string | null> {
      try {
        // Try native keychain first
        let Keychain: typeof import('react-native-keychain') | null = null;
        try {
          Keychain = await import('react-native-keychain');
        } catch {
          // Not available (web or missing dep) — use memory fallback
        }

        if (Keychain) {
          const credentials = await Keychain.getGenericPassword({ service });
          if (credentials) {
            const secret = credentials.password;
            return secret.startsWith('0x') ? secret : `0x${secret}`;
          }

          // Generate and store a new secret
          const newSecret = generateSecret();
          await Keychain.setGenericPassword('secret', newSecret, { service });
          return `0x${newSecret}`;
        }

        // In-memory fallback for web/testing
        console.warn(
          '[AuthAdapter] react-native-keychain unavailable — using volatile in-memory store. ' +
            'This is expected on web but indicates a missing native dependency on iOS/Android.',
        );
        let secret = memoryStore.get(service);
        if (!secret) {
          secret = generateSecret();
          memoryStore.set(service, secret);
        }
        return `0x${secret}`;
      } catch (error) {
        console.error('Failed to get/create private key:', error);
        return null;
      }
    },
  };
}
