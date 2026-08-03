// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface BridgeCustodyAdapter {
  lock(): Promise<void>;
  reset(): Promise<void>;
}

export function bridgeCustodyAdapter(bridge: WebViewBridge): BridgeCustodyAdapter {
  return {
    async lock(): Promise<void> {
      await bridge.request('custody', 'lock', {});
    },
    async reset(): Promise<void> {
      await bridge.request('custody', 'reset', {});
    },
  };
}
