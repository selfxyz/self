// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 as uuidv4 } from 'uuid';

import { isRequest, parseMessage } from './schema';
import type { BridgeDomain, BridgeError, BridgeEvent, BridgeRequest, BridgeResponse, NativeTransport } from './types';
import { BRIDGE_PROTOCOL_VERSION } from './types';

export type MockHandler = (params: Record<string, unknown>) => Promise<unknown> | unknown;

/**
 * Test utility that implements NativeTransport. Intercepts outgoing messages,
 * routes to registered mock handlers, and sends responses back via the bridge's
 * _handleResponse/_handleEvent methods.
 */
export class MockNativeBridge implements NativeTransport {
  private readonly handlers = new Map<string, MockHandler>();
  private readonly _messages: BridgeRequest[] = [];
  private bridge: {
    _handleResponse(json: string): void;
    _handleEvent(json: string): void;
  } | null = null;

  /**
   * Connect this mock to a bridge instance. Call this after creating the bridge
   * with this mock as the transport.
   */
  connect(bridge: { _handleResponse(json: string): void; _handleEvent(json: string): void }): void {
    this.bridge = bridge;
  }

  /**
   * Register a mock handler for a domain.method pair.
   */
  handle(domain: BridgeDomain, method: string, handler: MockHandler): void {
    this.handlers.set(`${domain}.${method}`, handler);
  }

  /**
   * Register a handler that returns a fixed value.
   */
  handleWith(domain: BridgeDomain, method: string, data: unknown): void {
    this.handle(domain, method, () => data);
  }

  /**
   * Register a handler that returns an error.
   */
  handleWithError(domain: BridgeDomain, method: string, error: BridgeError): void {
    this.handle(domain, method, () => {
      throw error;
    });
  }

  /**
   * Simulate a native event being pushed to the WebView.
   */
  pushEvent(domain: BridgeDomain, event: string, data: unknown): void {
    const msg: BridgeEvent = {
      type: 'event',
      version: BRIDGE_PROTOCOL_VERSION,
      id: uuidv4(),
      domain,
      event,
      data,
      timestamp: Date.now(),
    };
    this.bridge?._handleEvent(JSON.stringify(msg));
  }

  /**
   * Get all messages sent from the bridge.
   */
  get messages(): readonly BridgeRequest[] {
    return this._messages;
  }

  /**
   * Filter messages by domain.
   */
  messagesFor(domain: BridgeDomain): BridgeRequest[] {
    return this._messages.filter(m => m.domain === domain);
  }

  /**
   * Clear recorded messages.
   */
  clearMessages(): void {
    this._messages.length = 0;
  }

  /**
   * NativeTransport.postMessage implementation.
   * Called by the bridge when sending a request.
   */
  postMessage(json: string): void {
    const msg = parseMessage(json);
    if (!isRequest(msg)) return;

    this._messages.push(msg);

    const key = `${msg.domain}.${msg.method}`;
    const handler = this.handlers.get(key);

    if (!handler) {
      // No handler registered — send error response
      this.sendResponse(msg, false, undefined, {
        code: 'NO_HANDLER',
        message: `No mock handler registered for ${key}`,
      });
      return;
    }

    // Execute handler asynchronously
    Promise.resolve()
      .then(() => handler(msg.params))
      .then(data => {
        this.sendResponse(msg, true, data);
      })
      .catch((err: unknown) => {
        if (isBridgeError(err)) {
          this.sendResponse(msg, false, undefined, err);
        } else {
          this.sendResponse(msg, false, undefined, {
            code: 'HANDLER_ERROR',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
  }

  private sendResponse(request: BridgeRequest, success: boolean, data?: unknown, error?: BridgeError): void {
    const response: BridgeResponse = {
      type: 'response',
      version: BRIDGE_PROTOCOL_VERSION,
      id: uuidv4(),
      domain: request.domain,
      requestId: request.id,
      success,
      data: data ?? null,
      error: error ?? undefined,
      timestamp: Date.now(),
    };
    this.bridge?._handleResponse(JSON.stringify(response));
  }
}

function isBridgeError(err: unknown): err is BridgeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as BridgeError).code === 'string' &&
    typeof (err as BridgeError).message === 'string'
  );
}
