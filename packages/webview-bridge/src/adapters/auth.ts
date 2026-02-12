/**
 * Bridge auth adapter.
 *
 * Private key retrieval goes through the bridge to native secure storage,
 * gated by biometric authentication.
 */

import type { WebViewBridge } from '../bridge';

/** Mirrors AuthAdapter from mobile-sdk-alpha */
export interface AuthAdapter {
  getPrivateKey(): Promise<string | null>;
}

/**
 * Creates an auth adapter that retrieves the private key via the bridge.
 * The native side handles biometric gating and keychain/keystore access.
 */
export function bridgeAuthAdapter(bridge: WebViewBridge): AuthAdapter {
  return {
    async getPrivateKey(): Promise<string | null> {
      try {
        const result = await bridge.request<{ privateKey: string | null }>(
          'secureStorage',
          'get',
          { key: 'self_private_key', requireBiometric: true },
        );
        return result.privateKey;
      } catch {
        // Key not provisioned or biometric failed
        return null;
      }
    },
  };
}
