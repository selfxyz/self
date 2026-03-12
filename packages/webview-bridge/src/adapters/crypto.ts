// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createWebCryptoAdapter } from '@selfxyz/mobile-sdk-alpha/browser';

import type { WebViewBridge } from '../bridge';

export interface BridgeCryptoAdapter {
  hash(input: Uint8Array, algo?: 'sha256'): Promise<Uint8Array>;
  sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>;
  generateKey(keyRef: string): Promise<{ keyRef: string }>;
  getPublicKey(keyRef: string): Promise<Uint8Array>;
}

export function bridgeCryptoAdapter(
  bridge: WebViewBridge,
): BridgeCryptoAdapter {
  const webCryptoAdapter = createWebCryptoAdapter();

  return {
    async hash(
      input: Uint8Array,
      algo: 'sha256' = 'sha256',
    ): Promise<Uint8Array> {
      return webCryptoAdapter.hash(input, algo);
    },

    async sign(data: Uint8Array, keyRef: string): Promise<Uint8Array> {
      const base64Data = uint8ArrayToBase64(data);
      const result = await bridge.request<{ signature: string }>(
        'crypto',
        'sign',
        {
          data: base64Data,
          keyRef,
        },
      );
      if (typeof result?.signature !== 'string' || result.signature.length === 0) {
        throw new Error('Invalid or empty signature from bridge');
      }
      return base64ToUint8Array(result.signature);
    },

    async generateKey(keyRef: string): Promise<{ keyRef: string }> {
      const result = await bridge.request<{ keyRef: string; success: boolean }>(
        'crypto',
        'generateKey',
        { keyRef },
      );
      if (!result?.success || typeof result.keyRef !== 'string' || result.keyRef.length === 0) {
        throw new Error('Native key generation failed');
      }
      return { keyRef: result.keyRef };
    },

    async getPublicKey(keyRef: string): Promise<Uint8Array> {
      const result = await bridge.request<{ publicKey: string }>(
        'crypto',
        'getPublicKey',
        { keyRef },
      );
      if (typeof result?.publicKey !== 'string' || result.publicKey.length === 0) {
        throw new Error('Invalid or empty publicKey from bridge');
      }
      return base64ToUint8Array(result.publicKey);
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
