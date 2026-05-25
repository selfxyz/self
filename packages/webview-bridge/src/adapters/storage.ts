// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface BridgeStorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function bridgeStorageAdapter(bridge: WebViewBridge): BridgeStorageAdapter {
  return {
    async get(key: string): Promise<string | null> {
      const result = await bridge.request<string | { value: string | null } | null>('secureStorage', 'get', { key });
      if (result == null) return null;
      if (typeof result === 'string') return result;
      return result.value ?? null;
    },

    async set(key: string, value: string): Promise<void> {
      await bridge.request('secureStorage', 'set', { key, value });
    },

    async remove(key: string): Promise<void> {
      await bridge.request('secureStorage', 'remove', { key });
    },
  };
}
