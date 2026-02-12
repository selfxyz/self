/**
 * Bridge storage adapter.
 *
 * Key-value storage through the bridge to native secure/encrypted storage.
 */

import type { WebViewBridge } from '../bridge';

/** Mirrors StorageAdapter from mobile-sdk-alpha */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Creates a storage adapter that routes key-value operations through the bridge.
 */
export function bridgeStorageAdapter(bridge: WebViewBridge): StorageAdapter {
  return {
    async get(key: string): Promise<string | null> {
      const result = await bridge.request<string | null>(
        'secureStorage',
        'get',
        { key },
      );
      return result;
    },

    async set(key: string, value: string): Promise<void> {
      await bridge.request(
        'secureStorage',
        'set',
        { key, value },
      );
    },

    async remove(key: string): Promise<void> {
      await bridge.request(
        'secureStorage',
        'remove',
        { key },
      );
    },
  };
}
