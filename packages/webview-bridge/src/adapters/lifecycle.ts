// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import type { WebViewBridge } from '../bridge';

export interface BridgeLifecycleAdapter {
  ready(): void;
  dismiss(): void;
  setResult(result: Record<string, unknown>): Promise<void>;
}

export function bridgeLifecycleAdapter(bridge: WebViewBridge): BridgeLifecycleAdapter {
  return {
    ready(): void {
      bridge.fire('lifecycle', 'ready', {});
    },

    dismiss(): void {
      bridge.fire('lifecycle', 'dismiss', {});
    },

    async setResult(result: Record<string, unknown>): Promise<void> {
      await bridge.request('lifecycle', 'setResult', result);
    },
  };
}
