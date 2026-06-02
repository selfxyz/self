// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { BRIDGE_PROTOCOL_VERSION } from '@selfxyz/webview-bridge';

import type { BridgeDomain, BridgeRequest, BridgeResponse, BridgeEvent } from './types';
import { BridgeHandlerError } from './types';
import type { BridgeHandler } from './types';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function escapeForJs(jsonStr: string): string {
  const escaped = jsonStr
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `'${escaped}'`;
}

interface RouterConfig {
  sendToWebView: (js: string) => void;
  debug?: boolean;
  /**
   * Fired when an inbound request carries a non-matching, missing, or
   * non-numeric protocol version. The router stays policy-free: it reports
   * the raw `received` value and lets the host decide the UX. `received` is
   * the discriminator — a number means a definitive incompatibility, while
   * undefined/non-number is most likely a transient malformed frame.
   */
  onVersionMismatch?: (info: { received: unknown; expected: number }) => void;
}

export class MessageRouter {
  private readonly handlers = new Map<string, BridgeHandler>();
  private readonly config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  register(handler: BridgeHandler): void {
    this.handlers.set(handler.domain, handler);
  }

  onMessageReceived(rawJson: string): void {
    let request: BridgeRequest;
    try {
      request = JSON.parse(rawJson) as BridgeRequest;
    } catch {
      console.error('[SelfSDK] Failed to parse bridge message:', rawJson.substring(0, 200));
      return;
    }

    if (request.type !== 'request') {
      return;
    }

    if (request.version !== BRIDGE_PROTOCOL_VERSION) {
      this.config.onVersionMismatch?.({
        received: request.version,
        expected: BRIDGE_PROTOCOL_VERSION,
      });
      this.sendResponse({
        type: 'response',
        version: BRIDGE_PROTOCOL_VERSION,
        id: generateUuid(),
        domain: request.domain,
        requestId: request.id,
        success: false,
        error: {
          code: 'UNSUPPORTED_VERSION',
          message: `Bridge protocol version ${String(request.version)} not supported; host expects ${BRIDGE_PROTOCOL_VERSION}`,
        },
        timestamp: Date.now(),
      });
      return;
    }

    const handler = this.handlers.get(request.domain);
    if (!handler) {
      this.sendResponse({
        type: 'response',
        version: BRIDGE_PROTOCOL_VERSION,
        id: generateUuid(),
        domain: request.domain,
        requestId: request.id,
        success: false,
        error: {
          code: 'HANDLER_NOT_FOUND',
          message: `No handler registered for domain: ${request.domain}`,
        },
        timestamp: Date.now(),
      });
      return;
    }

    this.dispatchToHandler(handler, request);
  }

  pushEvent(domain: BridgeDomain, event: string, data: unknown): void {
    const bridgeEvent: BridgeEvent = {
      type: 'event',
      version: BRIDGE_PROTOCOL_VERSION,
      id: generateUuid(),
      domain,
      event,
      data,
      timestamp: Date.now(),
    };
    const eventJson = JSON.stringify(bridgeEvent);
    this.config.sendToWebView(
      `window.SelfNativeBridge._handleEvent(${escapeForJs(eventJson)});true;`,
    );
  }

  private async dispatchToHandler(handler: BridgeHandler, request: BridgeRequest): Promise<void> {
    try {
      const result = await handler.handle(request.method, request.params);
      this.sendResponse({
        type: 'response',
        version: BRIDGE_PROTOCOL_VERSION,
        id: generateUuid(),
        domain: request.domain,
        requestId: request.id,
        success: true,
        data: result ?? null,
        timestamp: Date.now(),
      });
    } catch (err) {
      if (err instanceof BridgeHandlerError) {
        this.sendResponse({
          type: 'response',
          version: BRIDGE_PROTOCOL_VERSION,
          id: generateUuid(),
          domain: request.domain,
          requestId: request.id,
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
          timestamp: Date.now(),
        });
      } else {
        this.sendResponse({
          type: 'response',
          version: BRIDGE_PROTOCOL_VERSION,
          id: generateUuid(),
          domain: request.domain,
          requestId: request.id,
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: err instanceof Error ? err.message : 'Unknown error',
          },
          timestamp: Date.now(),
        });
      }
    }
  }

  private sendResponse(response: BridgeResponse): void {
    const responseJson = JSON.stringify(response);
    this.log('→', response.domain, response.requestId, response.success);
    this.config.sendToWebView(
      `window.SelfNativeBridge._handleResponse(${escapeForJs(responseJson)});true;`,
    );
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[MessageRouter]', ...args);
    }
  }
}
