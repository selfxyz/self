// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface BridgeAnalyticsAdapter {
  trackEvent(event: string, payload?: Record<string, unknown>): void;
  trackNfcEvent(name: string, properties?: Record<string, unknown>): void;
  logNFCEvent(
    level: string,
    message: string,
    context: Record<string, unknown>,
    details?: Record<string, unknown>,
  ): void;
}

export function bridgeAnalyticsAdapter(
  bridge: WebViewBridge,
): BridgeAnalyticsAdapter {
  return {
    trackEvent(event: string, payload?: Record<string, unknown>): void {
      bridge.fire('analytics', 'trackEvent', { event, payload });
    },

    trackNfcEvent(name: string, properties?: Record<string, unknown>): void {
      bridge.fire('analytics', 'trackNfcEvent', { name, properties });
    },

    logNFCEvent(
      level: string,
      message: string,
      context: Record<string, unknown>,
      details?: Record<string, unknown>,
    ): void {
      bridge.fire('analytics', 'logNfcEvent', {
        level,
        message,
        context,
        details,
      });
    },
  };
}
