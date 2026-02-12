/**
 * WebViewBridge — JS-side bridge for communicating with the native shell.
 *
 * This class manages the request/response lifecycle, event subscriptions,
 * correlation IDs, timeouts, and serialization. It exposes three core methods:
 *
 * - `request()` — send a typed request to native and await the response
 * - `on()` — subscribe to native-pushed events
 * - `fire()` — send a fire-and-forget message (no response expected)
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  BridgeConfig,
  BridgeDomain,
  BridgeError,
  BridgeEvent,
  BridgeEventHandler,
  BridgeMessage,
  BridgeRequest,
  BridgeResponse,
} from './types';
import { BRIDGE_PROTOCOL_VERSION, DEFAULT_TIMEOUT_MS } from './types';

/** Pending request tracker. */
interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (error: BridgeError) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Interface that native platforms implement to receive messages from JS.
 * On Android this is exposed via `addJavascriptInterface`.
 * On iOS this is exposed via `WKScriptMessageHandler`.
 */
export interface NativeTransport {
  postMessage(message: string): void;
}

export class WebViewBridge {
  private pending = new Map<string, PendingRequest>();
  private listeners = new Map<string, Set<BridgeEventHandler>>();
  private config: Required<BridgeConfig>;
  private transport: NativeTransport | null = null;

  constructor(config?: BridgeConfig) {
    this.config = {
      defaultTimeout: config?.defaultTimeout ?? DEFAULT_TIMEOUT_MS,
      protocolVersion: config?.protocolVersion ?? BRIDGE_PROTOCOL_VERSION,
      debug: config?.debug ?? false,
    };

    // Auto-detect native transport
    this.detectTransport();

    // Register global handler for native → JS messages
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).SelfNativeBridge = {
        _handleResponse: (json: string) => this.handleMessage(json),
        _handleEvent: (json: string) => this.handleMessage(json),
      };
    }
  }

  /** Detect the native transport based on platform. */
  private detectTransport(): void {
    if (typeof globalThis === 'undefined') return;

    const g = globalThis as any;

    // Android: injected Java interface
    if (g.SelfNativeAndroid?.postMessage) {
      this.transport = g.SelfNativeAndroid;
      return;
    }

    // iOS: webkit message handler
    if (g.webkit?.messageHandlers?.selfNative?.postMessage) {
      this.transport = {
        postMessage: (msg: string) =>
          g.webkit.messageHandlers.selfNative.postMessage(msg),
      };
      return;
    }
  }

  /** Manually set the native transport (useful for testing). */
  setTransport(transport: NativeTransport): void {
    this.transport = transport;
  }

  /**
   * Send a request to native and await the response.
   *
   * @param domain - The bridge domain (e.g. 'nfc', 'biometrics')
   * @param method - The method within the domain (e.g. 'scan')
   * @param params - JSON-serializable parameters
   * @param timeoutMs - Optional timeout override
   * @returns The response data
   * @throws BridgeError on failure, timeout, or transport unavailability
   */
  async request<T = unknown>(
    domain: BridgeDomain,
    method: string,
    params: Record<string, unknown> = {},
    timeoutMs?: number,
  ): Promise<T> {
    const id = uuidv4();
    const timeout = timeoutMs ?? this.config.defaultTimeout;

    const message: BridgeRequest = {
      type: 'request',
      version: this.config.protocolVersion,
      id,
      domain,
      method,
      params,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject({
          code: 'BRIDGE_TIMEOUT',
          message: `Request ${domain}.${method} timed out after ${timeout}ms`,
        } satisfies BridgeError);
      }, timeout);

      this.pending.set(id, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timer,
      });

      this.send(message);
    });
  }

  /**
   * Fire a message to native without expecting a response.
   * Useful for analytics, haptics, and other fire-and-forget calls.
   */
  fire(
    domain: BridgeDomain,
    method: string,
    params: Record<string, unknown> = {},
  ): void {
    const message: BridgeRequest = {
      type: 'request',
      version: this.config.protocolVersion,
      id: uuidv4(),
      domain,
      method,
      params,
      timestamp: Date.now(),
    };

    this.send(message);
  }

  /**
   * Subscribe to events from native for a specific domain and event name.
   *
   * @param domain - The bridge domain
   * @param event - The event name within the domain
   * @param handler - Callback receiving the event data
   * @returns Unsubscribe function
   */
  on<T = unknown>(
    domain: BridgeDomain,
    event: string,
    handler: BridgeEventHandler<T>,
  ): () => void {
    const key = `${domain}:${event}`;
    const handlers = this.listeners.get(key) ?? new Set();
    handlers.add(handler as BridgeEventHandler);
    this.listeners.set(key, handlers);

    return () => {
      handlers.delete(handler as BridgeEventHandler);
      if (handlers.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Handle an incoming message from native (response or event).
   * Called by the global `SelfNativeBridge._handleResponse` / `_handleEvent`.
   */
  handleMessage(json: string): void {
    let message: BridgeMessage;

    try {
      message = JSON.parse(json) as BridgeMessage;
    } catch {
      if (this.config.debug) {
        console.error('[WebViewBridge] Failed to parse message:', json);
      }
      return;
    }

    if (this.config.debug) {
      console.log('[WebViewBridge] Received:', message.type, message);
    }

    switch (message.type) {
      case 'response':
        this.handleResponse(message as BridgeResponse);
        break;
      case 'event':
        this.handleEvent(message as BridgeEvent);
        break;
      default:
        if (this.config.debug) {
          console.warn('[WebViewBridge] Unknown message type:', message.type);
        }
    }
  }

  /** Resolve or reject a pending request based on the response. */
  private handleResponse(response: BridgeResponse): void {
    const pending = this.pending.get(response.requestId);
    if (!pending) {
      if (this.config.debug) {
        console.warn('[WebViewBridge] No pending request for:', response.requestId);
      }
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(response.requestId);

    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(
        response.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Native returned failure without error details',
        },
      );
    }
  }

  /** Dispatch an event to registered listeners. */
  private handleEvent(event: BridgeEvent): void {
    const key = `${event.domain}:${event.event}`;
    const handlers = this.listeners.get(key);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        handler(event.data);
      } catch (err) {
        if (this.config.debug) {
          console.error('[WebViewBridge] Event handler error:', err);
        }
      }
    }
  }

  /** Serialize and send a message to native. */
  private send(message: BridgeMessage): void {
    const json = JSON.stringify(message);

    if (this.config.debug) {
      console.log('[WebViewBridge] Sending:', message.type, message.domain, (message as BridgeRequest).method);
    }

    if (!this.transport) {
      // Re-detect in case native injected late
      this.detectTransport();
    }

    if (!this.transport) {
      // If still no transport, reject the pending request
      if (message.type === 'request') {
        const pending = this.pending.get(message.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.pending.delete(message.id);
          pending.reject({
            code: 'NO_TRANSPORT',
            message: 'Native bridge transport not available',
          });
        }
      }
      return;
    }

    this.transport.postMessage(json);
  }

  /** Get the number of pending requests (useful for debugging). */
  get pendingCount(): number {
    return this.pending.size;
  }

  /** Tear down the bridge, rejecting all pending requests. */
  destroy(): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject({
        code: 'BRIDGE_DESTROYED',
        message: 'Bridge was destroyed',
      });
      this.pending.delete(id);
    }

    this.listeners.clear();

    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any).SelfNativeBridge;
    }

    this.transport = null;
  }
}
