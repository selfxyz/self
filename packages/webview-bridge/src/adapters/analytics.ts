/**
 * Bridge analytics adapter.
 *
 * Fire-and-forget bridge calls — analytics events are sent to native
 * but we don't wait for a response.
 */

import type { WebViewBridge } from '../bridge';

/** Mirrors AnalyticsAdapter from mobile-sdk-alpha */
export interface AnalyticsAdapter {
  trackEvent?(event: string, payload?: Record<string, unknown>): void;
  trackNfcEvent?(name: string, properties?: Record<string, unknown>): void;
  logNFCEvent?(
    level: string,
    message: string,
    context: Record<string, unknown>,
    details?: Record<string, unknown>,
  ): void;
}

/**
 * Creates an analytics adapter that fires events through the bridge
 * without waiting for responses.
 */
export function bridgeAnalyticsAdapter(bridge: WebViewBridge): AnalyticsAdapter {
  return {
    trackEvent(event: string, payload?: Record<string, unknown>): void {
      bridge.fire('analytics', 'trackEvent', { event, payload: payload ?? {} });
    },

    trackNfcEvent(name: string, properties?: Record<string, unknown>): void {
      bridge.fire('analytics', 'trackNfcEvent', { name, properties: properties ?? {} });
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
        details: details ?? {},
      });
    },
  };
}
