// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
  BrowserHostOptions,
  SelfHostMessage,
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
    ReactNativeWebView?: NativeTransport;
  }
}

class BrowserHostTransport implements NativeTransport {
  readonly kind = 'browser-host' as const;

  constructor(
    public readonly target: Window,
    public readonly targetOrigin: string,
  ) {}

  postMessage(json: string): void {
    const request = parseOutgoingRequest(json);
    if (!request || request.domain !== 'lifecycle') {
      return;
    }

    const message = mapLifecycleRequestToHostMessage(request);
    if (!message) {
      return;
    }

    this.target.postMessage(message, this.targetOrigin);
  }
}

export class WebViewBridge {
  private readonly transport: NativeTransport | null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly listeners = new Map<string, Set<EventHandler>>();
  private readonly debug: boolean;
  private readonly hostMessageListener?: (event: MessageEvent) => void;
  private destroyed = false;

  constructor(options: WebViewBridgeOptions = {}) {
    this.debug = options.debug ?? false;
    this.transport =
      options.transport ?? this.detectTransport(options.browserHost);

    // Register global bridge for native callbacks
    globalThis.SelfNativeBridge = this;

    if (this.transport instanceof BrowserHostTransport) {
      this.hostMessageListener = this.createHostMessageListener(this.transport);
      window.addEventListener('message', this.hostMessageListener);
    }
  }

  private detectTransport(browserHost?: BrowserHostOptions): NativeTransport | null {
    // Android (KMP)
    if (globalThis.SelfNativeAndroid?.postMessage) {
      return globalThis.SelfNativeAndroid;
    }
    // iOS (KMP)
    if (
      typeof window !== 'undefined' &&
      window.webkit?.messageHandlers?.SelfNativeIOS?.postMessage
    ) {
      return window.webkit.messageHandlers.SelfNativeIOS;
    }
    // React Native WebView
    if (typeof window !== 'undefined' && window.ReactNativeWebView?.postMessage) {
      return window.ReactNativeWebView;
    }

    return this.detectBrowserHostTransport(browserHost);
  }

  private detectBrowserHostTransport(
    browserHost?: BrowserHostOptions,
  ): NativeTransport | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const hostTarget =
      window.parent !== window
        ? window.parent
        : window.opener && !window.opener.closed
          ? window.opener
          : null;

    if (!hostTarget) {
      return null;
    }

    if (!browserHost?.targetOrigin) {
      this.log(
        'Browser host detected but no targetOrigin was configured; transport disabled',
      );
      return null;
    }

    return new BrowserHostTransport(hostTarget, browserHost.targetOrigin);
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

  private createHostMessageListener(
    transport: BrowserHostTransport,
  ): (event: MessageEvent) => void {
    return (event: MessageEvent) => {
      if (
        transport.targetOrigin !== '*' &&
        event.origin !== transport.targetOrigin
      ) {
        return;
      }

      if (event.source !== transport.target) {
        return;
      }

      const message = parseHostMessage(event.data);
      if (!message || message.type !== 'self:cancel') {
        return;
      }

      this.dispatchEvent({
        type: 'event',
        version: BRIDGE_PROTOCOL_VERSION,
        id: uuidv4(),
        domain: 'lifecycle',
        event: 'cancel',
        data: message.payload,
        timestamp: Date.now(),
      });
    };
  }

  /**
   * Send a request and wait for a response.
   */
  request<T = unknown>(
    domain: BridgeDomain,
    method: string,
    params: object = {},
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
      params: params as Record<string, unknown>,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `Bridge request timed out: ${domain}.${method} (${timeoutMs}ms)`,
          ),
        );
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
    params: object = {},
  ): void {
    const id = uuidv4();
    const message: BridgeRequest = {
      type: 'request',
      version: BRIDGE_PROTOCOL_VERSION,
      id,
      domain,
      method,
      params: params as Record<string, unknown>,
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
      const error = response.error ?? {
        code: 'UNKNOWN',
        message: 'Unknown error',
      };
      const err = new Error(error.message);
      (
        err as Error & { code: string; details?: Record<string, unknown> }
      ).code = error.code;
      if (error.details) {
        (err as Error & { details: Record<string, unknown> }).details =
          error.details;
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
   * True when lifecycle traffic is being proxied to a browser host via postMessage.
   */
  get usesBrowserHostTransport(): boolean {
    return this.transport?.kind === 'browser-host';
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

    if (
      this.hostMessageListener &&
      typeof window !== 'undefined'
    ) {
      window.removeEventListener('message', this.hostMessageListener);
    }

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

function parseOutgoingRequest(json: string): BridgeRequest | null {
  try {
    const candidate = JSON.parse(json) as Partial<BridgeRequest>;
    if (
      candidate.type !== 'request' ||
      candidate.version !== BRIDGE_PROTOCOL_VERSION ||
      typeof candidate.id !== 'string' ||
      typeof candidate.domain !== 'string' ||
      typeof candidate.method !== 'string' ||
      typeof candidate.timestamp !== 'number' ||
      typeof candidate.params !== 'object' ||
      candidate.params === null
    ) {
      return null;
    }

    return candidate as BridgeRequest;
  } catch {
    return null;
  }
}

function mapLifecycleRequestToHostMessage(
  request: BridgeRequest,
): SelfHostMessage | null {
  switch (request.method) {
    case 'ready':
      return {
        type: 'self:ready',
        version: 1,
        payload: request.params,
      };
    case 'setResult':
      return {
        type: 'self:result',
        version: 1,
        payload: request.params,
      };
    case 'dismiss':
      return {
        type: 'self:dismiss',
        version: 1,
        payload: request.params,
      };
    default:
      return null;
  }
}

function parseHostMessage(data: unknown): SelfHostMessage | null {
  let candidate: unknown = data;

  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const message = candidate as Partial<SelfHostMessage>;
  if (
    message.version !== BRIDGE_PROTOCOL_VERSION ||
    (message.type !== 'self:ready' &&
      message.type !== 'self:result' &&
      message.type !== 'self:dismiss' &&
      message.type !== 'self:cancel')
  ) {
    return null;
  }

  return {
    type: message.type,
    version: 1,
    payload:
      typeof message.payload === 'object' && message.payload !== null
        ? message.payload
        : {},
  };
}
