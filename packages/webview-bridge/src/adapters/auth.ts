// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface BridgeAuthAdapter {
  getPrivateKey(): Promise<string | null>;
}

export function bridgeAuthAdapter(bridge: WebViewBridge): BridgeAuthAdapter {
  return {
    async getPrivateKey(): Promise<string | null> {
      try {
        const result = await bridge.request<string | { value: string | null } | null>('secureStorage', 'get', {
          key: 'self_private_key',
          requireBiometric: true,
        });
        if (result == null) return null;
        if (typeof result === 'string') return result;
        return result.value ?? null;
      } catch {
        return null;
      }
    },
  };
}
