/**
 * Bridge crypto adapter.
 *
 * `hash()` stays entirely in the WebView using the Web Crypto API — no bridge
 * round-trip needed. `sign()` goes through the bridge to access the native
 * secure enclave / Android Keystore.
 */

import type { WebViewBridge } from '../bridge';

/** Mirrors CryptoAdapter from mobile-sdk-alpha */
export interface CryptoAdapter {
  hash(input: Uint8Array, algo?: 'sha256'): Promise<Uint8Array>;
  sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>;
}

/**
 * Creates a crypto adapter that uses Web Crypto for hashing and the bridge
 * for signing operations that require native key material.
 */
export function bridgeCryptoAdapter(bridge: WebViewBridge): CryptoAdapter {
  return {
    async hash(input: Uint8Array, algo: 'sha256' = 'sha256'): Promise<Uint8Array> {
      const algoMap: Record<string, string> = {
        sha256: 'SHA-256',
      };

      const webCryptoAlgo = algoMap[algo];
      if (!webCryptoAlgo) {
        throw new Error(`Unsupported hash algorithm: ${algo}`);
      }

      const hashBuffer = await crypto.subtle.digest(webCryptoAlgo, input);
      return new Uint8Array(hashBuffer);
    },

    async sign(data: Uint8Array, keyRef: string): Promise<Uint8Array> {
      // Encode data as base64 for JSON transport
      const dataBase64 = uint8ArrayToBase64(data);

      const result = await bridge.request<{ signature: string }>(
        'crypto',
        'sign',
        { data: dataBase64, keyRef },
      );

      return base64ToUint8Array(result.signature);
    },
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
