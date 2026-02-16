// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import type { WebViewBridge } from '../bridge';

export interface BridgeAuthAdapter {
  getPrivateKey(): Promise<string | null>;
}

export function bridgeAuthAdapter(bridge: WebViewBridge): BridgeAuthAdapter {
  return {
    async getPrivateKey(): Promise<string | null> {
      try {
        const result = await bridge.request<{ value: string | null }>('secureStorage', 'get', {
          key: 'self_private_key',
          requireBiometric: true,
        });
        return result?.value ?? null;
      } catch {
        return null;
      }
    },
  };
}
