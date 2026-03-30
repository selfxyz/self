// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';
import type { VerificationDismissPayload, VerificationResult } from '../types';

export interface BridgeLifecycleAdapter {
  ready(payload?: Record<string, unknown>): void;
  dismiss(payload?: VerificationDismissPayload): void;
  setResult(result: VerificationResult): Promise<void>;
}

export function bridgeLifecycleAdapter(bridge: WebViewBridge): BridgeLifecycleAdapter {
  return {
    ready(payload: Record<string, unknown> = {}): void {
      bridge.fire('lifecycle', 'ready', payload);
    },

    dismiss(payload: VerificationDismissPayload = {}): void {
      bridge.fire('lifecycle', 'dismiss', payload);
    },

    async setResult(result: VerificationResult): Promise<void> {
      if (bridge.usesBrowserHostTransport) {
        bridge.fire('lifecycle', 'setResult', result);
        return;
      }

      await bridge.request('lifecycle', 'setResult', result);
    },
  };
}
