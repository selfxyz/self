/**
 * MockNativeBridge — test utility that simulates native bridge responses.
 *
 * Use this in unit and integration tests to verify that bridge adapters
 * correctly route calls through the bridge protocol. Register handlers for
 * specific domain/method pairs and they will be invoked when the bridge
 * sends a request.
 */

import type {
  BridgeDomain,
  BridgeError,
  BridgeEvent,
  BridgeRequest,
  BridgeResponse,
  NfcScanProgress,
} from './types';
import { BRIDGE_PROTOCOL_VERSION } from './types';
import type { NativeTransport } from './bridge';
import { WebViewBridge } from './bridge';

type MockHandler = (params: Record<string, unknown>) => Promise<unknown> | unknown;

export class MockNativeBridge implements NativeTransport {
  private handlers = new Map<string, MockHandler>();
  private bridge: WebViewBridge;
  private sentMessages: BridgeRequest[] = [];

  constructor(bridge: WebViewBridge) {
    this.bridge = bridge;
    bridge.setTransport(this);
  }

  /** Register a handler for a domain/method pair. */
  handle(domain: BridgeDomain, method: string, handler: MockHandler): this {
    this.handlers.set(`${domain}:${method}`, handler);
    return this;
  }

  /** Register a handler that always returns a specific value. */
  handleWith(domain: BridgeDomain, method: string, data: unknown): this {
    return this.handle(domain, method, () => data);
  }

  /** Register a handler that always throws an error. */
  handleWithError(domain: BridgeDomain, method: string, error: BridgeError): this {
    return this.handle(domain, method, () => {
      throw error;
    });
  }

  /** Get all messages sent through the bridge for assertions. */
  get messages(): readonly BridgeRequest[] {
    return this.sentMessages;
  }

  /** Get messages filtered by domain. */
  messagesFor(domain: BridgeDomain): BridgeRequest[] {
    return this.sentMessages.filter((m) => m.domain === domain);
  }

  /** Get messages filtered by domain and method. */
  messagesForMethod(domain: BridgeDomain, method: string): BridgeRequest[] {
    return this.sentMessages.filter(
      (m) => m.domain === domain && m.method === method,
    );
  }

  /** Clear recorded messages. */
  clearMessages(): void {
    this.sentMessages = [];
  }

  /** Simulate a native event being pushed to the WebView. */
  pushEvent(domain: BridgeDomain, event: string, data: unknown): void {
    const eventMessage: BridgeEvent = {
      type: 'event',
      version: BRIDGE_PROTOCOL_VERSION,
      id: crypto.randomUUID?.() ?? `mock-${Date.now()}-${Math.random()}`,
      domain,
      event,
      data,
      timestamp: Date.now(),
    };

    this.bridge.handleMessage(JSON.stringify(eventMessage));
  }

  /** Simulate NFC scan progress events. */
  pushNfcProgress(progress: NfcScanProgress): void {
    this.pushEvent('nfc', 'scanProgress', progress);
  }

  /**
   * NativeTransport implementation — called when the WebView sends a message.
   * Routes to registered handlers and sends the response back.
   */
  postMessage(message: string): void {
    const request = JSON.parse(message) as BridgeRequest;
    this.sentMessages.push(request);

    if (request.type !== 'request') return;

    const key = `${request.domain}:${request.method}`;
    const handler = this.handlers.get(key);

    if (!handler) {
      // Auto-respond with error for unhandled methods
      this.respond(request, false, undefined, {
        code: 'NOT_IMPLEMENTED',
        message: `No mock handler for ${key}`,
      });
      return;
    }

    // Execute handler asynchronously
    Promise.resolve()
      .then(() => handler(request.params))
      .then((data) => {
        this.respond(request, true, data);
      })
      .catch((err) => {
        const error: BridgeError =
          err && typeof err === 'object' && 'code' in err
            ? (err as BridgeError)
            : {
                code: 'MOCK_ERROR',
                message: err instanceof Error ? err.message : String(err),
              };
        this.respond(request, false, undefined, error);
      });
  }

  /** Send a response back to the bridge. */
  private respond(
    request: BridgeRequest,
    success: boolean,
    data?: unknown,
    error?: BridgeError,
  ): void {
    const response: BridgeResponse = {
      type: 'response',
      version: BRIDGE_PROTOCOL_VERSION,
      id: crypto.randomUUID?.() ?? `mock-resp-${Date.now()}`,
      domain: request.domain,
      requestId: request.id,
      success,
      data,
      error,
      timestamp: Date.now(),
    };

    this.bridge.handleMessage(JSON.stringify(response));
  }
}
