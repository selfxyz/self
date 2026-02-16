// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import { v4 as uuidv4 } from 'uuid';
import type {
  BridgeDomain,
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  NativeTransport,
  WebViewBridgeOptions,
  PendingRequest,
  EventHandler,
} from './types';
import { BRIDGE_PROTOCOL_VERSION, DEFAULT_TIMEOUT_MS } from './types';
import { parseMessage, isResponse, isEvent } from './schema';

declare global {
  // eslint-disable-next-line no-var
  var SelfNativeAndroid: NativeTransport | undefined;
  // eslint-disable-next-line no-var
  var SelfNativeBridge: WebViewBridge | undefined;

  interface Window {
    webkit?: {
      messageHandlers?: {
        SelfNativeIOS?: NativeTransport;
      };
    };
  }
}

export class WebViewBridge {
  private readonly transport: NativeTransport | null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly listeners = new Map<string, Set<EventHandler>>();
  private readonly debug: boolean;
  private destroyed = false;

  constructor(options: WebViewBridgeOptions = {}) {
    this.debug = options.debug ?? false;
    this.transport = options.transport ?? this.detectTransport();

    // Register global bridge for native callbacks
    globalThis.SelfNativeBridge = this;
  }

  private detectTransport(): NativeTransport | null {
    // Android
    if (globalThis.SelfNativeAndroid?.postMessage) {
      return globalThis.SelfNativeAndroid;
    }
    // iOS
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.SelfNativeIOS?.postMessage) {
      return window.webkit.messageHandlers.SelfNativeIOS;
    }
    return null;
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[WebViewBridge]', ...args);
    }
  }

  private send(message: BridgeRequest): void {
    if (this.destroyed) {
      throw new Error('Bridge has been destroyed');
    }

    const json = JSON.stringify(message);
    this.log('→', message.domain, message.method, message.params);

    if (!this.transport) {
      this.log('No native transport available, message dropped');
      return;
    }

    this.transport.postMessage(json);
  }

  /**
   * Send a request and wait for a response.
   */
  request<T = unknown>(
    domain: BridgeDomain,
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    if (this.destroyed) {
      return Promise.reject(new Error('Bridge has been destroyed'));
    }

    const id = uuidv4();
    const message: BridgeRequest = {
      type: 'request',
      version: BRIDGE_PROTOCOL_VERSION,
      id,
      domain,
      method,
      params,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Bridge request timed out: ${domain}.${method} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      this.send(message);
    });
  }

  /**
   * Fire-and-forget: send a request without waiting for a response.
   */
  fire(
    domain: BridgeDomain,
    method: string,
    params: Record<string, unknown> = {},
  ): void {
    const id = uuidv4();
    const message: BridgeRequest = {
      type: 'request',
      version: BRIDGE_PROTOCOL_VERSION,
      id,
      domain,
      method,
      params,
      timestamp: Date.now(),
    };
    this.send(message);
  }

  /**
   * Subscribe to native events for a domain:event pair.
   * Returns an unsubscribe function.
   */
  on(domain: BridgeDomain, event: string, handler: EventHandler): () => void {
    const key = `${domain}:${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);

    return () => {
      const handlers = this.listeners.get(key);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Called by native via evaluateJavaScript:
   *   window.SelfNativeBridge._handleResponse(json)
   */
  _handleResponse(json: string): void {
    this.log('← response', json.substring(0, 200));
    try {
      const msg = parseMessage(json);
      if (!isResponse(msg)) {
        this.log('Expected response, got:', msg.type);
        return;
      }
      this.resolveResponse(msg);
    } catch (err) {
      this.log('Failed to parse response:', err);
    }
  }

  /**
   * Called by native via evaluateJavaScript:
   *   window.SelfNativeBridge._handleEvent(json)
   */
  _handleEvent(json: string): void {
    this.log('← event', json.substring(0, 200));
    try {
      const msg = parseMessage(json);
      if (!isEvent(msg)) {
        this.log('Expected event, got:', msg.type);
        return;
      }
      this.dispatchEvent(msg);
    } catch (err) {
      this.log('Failed to parse event:', err);
    }
  }

  private resolveResponse(response: BridgeResponse): void {
    const pending = this.pending.get(response.requestId);
    if (!pending) {
      this.log('No pending request for:', response.requestId);
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(response.requestId);

    if (response.success) {
      pending.resolve(response.data);
    } else {
      const error = response.error ?? { code: 'UNKNOWN', message: 'Unknown error' };
      const err = new Error(error.message);
      (err as Error & { code: string; details?: Record<string, unknown> }).code = error.code;
      if (error.details) {
        (err as Error & { details: Record<string, unknown> }).details = error.details;
      }
      pending.reject(err);
    }
  }

  private dispatchEvent(event: BridgeEvent): void {
    const key = `${event.domain}:${event.event}`;
    const handlers = this.listeners.get(key);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event.data);
        } catch (err) {
          this.log('Event handler error:', err);
        }
      }
    }
  }

  /**
   * Check if a native transport is available.
   */
  get isConnected(): boolean {
    return this.transport !== null;
  }

  /**
   * Number of pending requests.
   */
  get pendingCount(): number {
    return this.pending.size;
  }

  /**
   * Tear down the bridge: reject all pending, clear listeners, remove global.
   */
  destroy(): void {
    this.destroyed = true;

    // Reject all pending requests
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Bridge destroyed'));
      this.pending.delete(id);
    }

    // Clear listeners
    this.listeners.clear();

    // Remove global
    if (globalThis.SelfNativeBridge === this) {
      globalThis.SelfNativeBridge = undefined;
    }
  }
}
