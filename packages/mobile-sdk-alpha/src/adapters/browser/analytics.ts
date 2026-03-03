// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NFCScanContext } from '../../proving/internal/logging';
import type { LogLevel } from '../../types/base';
import type { AnalyticsAdapter, TrackEventParams } from '../../types/public';

export interface WebAnalyticsOptions {
  /** Remote endpoint to POST events to. When omitted, events are only logged to console. */
  endpoint?: string;
  /** When true, logs every event to console regardless of endpoint. */
  debug?: boolean;
}

/**
 * Creates an {@link AnalyticsAdapter} that logs to the browser console
 * and optionally POSTs events to a remote endpoint.
 *
 * All methods are fire-and-forget — network failures are silently swallowed
 * so analytics never block critical user flows.
 */
export function createWebAnalyticsAdapter(options?: WebAnalyticsOptions): AnalyticsAdapter {
  const { endpoint, debug = false } = options ?? {};

  function send(payload: Record<string, unknown>): void {
    if (debug) {
      console.log('[Analytics]', payload);
    }
    if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently swallow — analytics must never block user flows.
      });
    }
  }

  return {
    trackEvent(event: string, payload?: TrackEventParams): void {
      send({ type: 'event', event, ...payload, timestamp: Date.now() });
    },

    trackNfcEvent(name: string, properties?: Record<string, unknown>): void {
      send({ type: 'nfc_event', name, ...properties, timestamp: Date.now() });
    },

    logNFCEvent(level: LogLevel, message: string, context: NFCScanContext, details?: Record<string, unknown>): void {
      send({ type: 'nfc_log', level, message, context, details, timestamp: Date.now() });
    },
  };
}
