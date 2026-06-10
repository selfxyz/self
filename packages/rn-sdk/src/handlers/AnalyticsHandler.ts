// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

export interface AnalyticsSink {
  trackEvent(name: string, properties?: Record<string, unknown>): void;
  trackNfcEvent?(name: string, properties?: Record<string, unknown>): void;
  logNfcEvent?(
    level: string,
    message: string,
    context: Record<string, unknown>,
    details?: Record<string, unknown>,
  ): void;
}

const noopSink: AnalyticsSink = {
  trackEvent(): void {},
};

export class AnalyticsHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'analytics';
  private readonly sink: AnalyticsSink;

  constructor(sink?: AnalyticsSink) {
    this.sink = sink ?? noopSink;
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'trackEvent': {
        const event = params.event as string | undefined;
        if (!event) {
          throw new BridgeHandlerError('MISSING_EVENT', 'event parameter required');
        }
        const payload = params.payload as Record<string, unknown> | undefined;
        this.sink.trackEvent(event, payload);
        return null;
      }
      case 'trackNfcEvent': {
        const name = params.name as string | undefined;
        if (!name) {
          throw new BridgeHandlerError('MISSING_NAME', 'name parameter required');
        }
        const properties = params.properties as Record<string, unknown> | undefined;
        this.sink.trackNfcEvent?.(name, properties);
        return null;
      }
      case 'logNfcEvent': {
        const level = (params.level as string | undefined) ?? 'info';
        const message = (params.message as string | undefined) ?? '';
        const context = (params.context as Record<string, unknown> | undefined) ?? {};
        const details = params.details as Record<string, unknown> | undefined;
        this.sink.logNfcEvent?.(level, message, context, details);
        return null;
      }
      default:
        throw new BridgeHandlerError(
          'METHOD_NOT_FOUND',
          `Unknown analytics method: ${method}`,
        );
    }
  }
}
