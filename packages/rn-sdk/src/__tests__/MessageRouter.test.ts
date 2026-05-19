// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageRouter } from '../bridge/MessageRouter';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';

function makeRequest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'request',
    version: 1,
    id: 'req-1',
    domain: 'lifecycle',
    method: 'ready',
    params: {},
    timestamp: Date.now(),
    ...overrides,
  });
}

describe('MessageRouter', () => {
  let sendToWebView: ReturnType<typeof vi.fn>;
  let router: MessageRouter;

  beforeEach(() => {
    sendToWebView = vi.fn();
    router = new MessageRouter({ sendToWebView });
  });

  function parseLastSentResponse(): Record<string, unknown> {
    const call = sendToWebView.mock.calls[sendToWebView.mock.calls.length - 1][0] as string;
    // Extract JSON from: window.SelfNativeBridge._handleResponse('...');true;
    const match = call.match(/_handle(?:Response|Event)\('(.+)'\);true;/);
    expect(match).toBeTruthy();
    // Unescape the JS string
    const unescaped = match![1]
      .replace(/\\'/g, "'")
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
    return JSON.parse(unescaped) as Record<string, unknown>;
  }

  it('should route a request to the correct handler', async () => {
    const handler: BridgeHandler = {
      domain: 'lifecycle',
      handle: vi.fn().mockResolvedValue({ ready: true }),
    };
    router.register(handler);

    router.onMessageReceived(makeRequest());
    // Wait for async dispatch
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ ready: true });
    expect(response.requestId).toBe('req-1');
    expect(response.domain).toBe('lifecycle');
  });

  it('should return HANDLER_NOT_FOUND for unregistered domain', async () => {
    router.onMessageReceived(makeRequest({ domain: 'nfc' }));
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(false);
    expect(response.error).toEqual(
      expect.objectContaining({
        code: 'HANDLER_NOT_FOUND',
      }),
    );
  });

  it('should return UNSUPPORTED_VERSION when the inbound version mismatches', async () => {
    router.onMessageReceived(makeRequest({ version: 99 }));
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(false);
    expect(response.error).toEqual(
      expect.objectContaining({
        code: 'UNSUPPORTED_VERSION',
      }),
    );
  });

  it('should accept inbound messages that omit the version field', async () => {
    // Older WebView builds that do not stamp `version` should still route
    // — the host falls back to its own protocol version.
    const handler: BridgeHandler = {
      domain: 'lifecycle',
      handle: vi.fn().mockResolvedValue(null),
    };
    router.register(handler);

    const payload = JSON.stringify({
      type: 'request',
      id: 'req-no-version',
      domain: 'lifecycle',
      method: 'ready',
      params: {},
      timestamp: Date.now(),
    });
    router.onMessageReceived(payload);
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(true);
  });

  it('should handle BridgeHandlerError from handler', async () => {
    const handler: BridgeHandler = {
      domain: 'lifecycle',
      handle: vi.fn().mockRejectedValue(
        new BridgeHandlerError('CUSTOM_ERROR', 'Something went wrong', { detail: 'info' }),
      ),
    };
    router.register(handler);

    router.onMessageReceived(makeRequest());
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(false);
    expect(response.error).toEqual(
      expect.objectContaining({
        code: 'CUSTOM_ERROR',
        message: 'Something went wrong',
        details: { detail: 'info' },
      }),
    );
  });

  it('should handle generic errors with INTERNAL_ERROR code', async () => {
    const handler: BridgeHandler = {
      domain: 'lifecycle',
      handle: vi.fn().mockRejectedValue(new Error('kaboom')),
    };
    router.register(handler);

    router.onMessageReceived(makeRequest());
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(false);
    expect(response.error).toEqual(
      expect.objectContaining({
        code: 'INTERNAL_ERROR',
        message: 'kaboom',
      }),
    );
  });

  it('should log error and drop malformed JSON', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    router.onMessageReceived('not valid json');
    expect(sendToWebView).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      '[SelfSDK] Failed to parse bridge message:',
      expect.any(String),
    );
    errorSpy.mockRestore();
  });

  it('should ignore non-request messages', () => {
    router.onMessageReceived(JSON.stringify({
      type: 'response',
      version: 1,
      id: 'resp-1',
      domain: 'lifecycle',
      requestId: 'req-1',
      success: true,
      timestamp: Date.now(),
    }));
    expect(sendToWebView).not.toHaveBeenCalled();
  });

  it('should return null data when handler returns undefined', async () => {
    const handler: BridgeHandler = {
      domain: 'lifecycle',
      handle: vi.fn().mockResolvedValue(undefined),
    };
    router.register(handler);

    router.onMessageReceived(makeRequest());
    await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

    const response = parseLastSentResponse();
    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });

  describe('pushEvent', () => {
    it('should send event via _handleEvent', () => {
      router.pushEvent('nfc', 'scanProgress', { step: 'reading', percent: 50 });

      expect(sendToWebView).toHaveBeenCalledOnce();
      const call = sendToWebView.mock.calls[0][0] as string;
      expect(call).toContain('_handleEvent');

      const match = call.match(/_handleEvent\('(.+)'\);true;/);
      expect(match).toBeTruthy();
      const unescaped = match![1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      const event = JSON.parse(unescaped) as Record<string, unknown>;
      expect(event.type).toBe('event');
      expect(event.domain).toBe('nfc');
      expect(event.event).toBe('scanProgress');
      expect(event.data).toEqual({ step: 'reading', percent: 50 });
    });
  });

  describe('escapeForJs', () => {
    it('should handle JSON with single quotes', async () => {
      const handler: BridgeHandler = {
        domain: 'lifecycle',
        handle: vi.fn().mockResolvedValue({ message: "it's working" }),
      };
      router.register(handler);

      router.onMessageReceived(makeRequest());
      await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

      // Should not throw — the JS string is properly escaped
      const response = parseLastSentResponse();
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ message: "it's working" });
    });

    it('should handle JSON with backslashes in values', async () => {
      const handler: BridgeHandler = {
        domain: 'lifecycle',
        handle: vi.fn().mockResolvedValue({ path: 'C:\\Users\\test' }),
      };
      router.register(handler);

      router.onMessageReceived(makeRequest());
      await vi.waitFor(() => expect(sendToWebView).toHaveBeenCalled());

      // Verify the raw JS string contains properly escaped content
      const call = sendToWebView.mock.calls[0][0] as string;
      expect(call).toContain('_handleResponse');
      expect(call).toContain('C:\\\\');
    });
  });
});
