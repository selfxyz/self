// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebViewBridge } from '../bridge';
import { MockNativeBridge } from '../mock';
import type { SelfHostMessage } from '../types';

type MockWindowWithListeners = Window & {
  __dispatchMessage(event: MessageEvent): void;
};

describe('WebViewBridge', () => {
  let mock: MockNativeBridge;
  let bridge: WebViewBridge;

  beforeEach(() => {
    mock = new MockNativeBridge();
    bridge = new WebViewBridge({ transport: mock });
    mock.connect(bridge);
  });

  afterEach(() => {
    bridge.destroy();
    vi.unstubAllGlobals();
  });

  describe('request/response', () => {
    it('should send a request and receive a response', async () => {
      mock.handleWith('secureStorage', 'get', { value: 'test-value' });

      const result = await bridge.request<{ value: string }>(
        'secureStorage',
        'get',
        { key: 'test' },
      );
      expect(result).toEqual({ value: 'test-value' });
    });

    it('should reject when handler returns an error', async () => {
      mock.handleWithError('secureStorage', 'get', {
        code: 'NOT_FOUND',
        message: 'Key not found',
      });

      await expect(
        bridge.request('secureStorage', 'get', { key: 'missing' }),
      ).rejects.toThrow('Key not found');
    });

    it('should reject when no handler is registered', async () => {
      await expect(
        bridge.request('secureStorage', 'get', { key: 'test' }),
      ).rejects.toThrow('No mock handler registered');
    });

    it('should timeout when no response arrives', async () => {
      // Register a handler that never resolves
      mock.handle('nfc', 'scan', () => new Promise(() => {}));

      await expect(bridge.request('nfc', 'scan', {}, 50)).rejects.toThrow(
        'timed out',
      );
    });

    it('should track pending count', async () => {
      mock.handle('nfc', 'scan', () => new Promise(() => {}));
      expect(bridge.pendingCount).toBe(0);

      const promise = bridge.request('nfc', 'scan', {}, 100);
      expect(bridge.pendingCount).toBe(1);

      await expect(promise).rejects.toThrow('timed out');
      expect(bridge.pendingCount).toBe(0);
    });
  });

  describe('fire (fire-and-forget)', () => {
    it('should send a message without waiting', () => {
      bridge.fire('analytics', 'trackEvent', { event: 'page_view' });

      const messages = mock.messagesFor('analytics');
      expect(messages).toHaveLength(1);
      expect(messages[0].method).toBe('trackEvent');
      expect(messages[0].params).toEqual({ event: 'page_view' });
    });

    it('should not create pending entries', () => {
      bridge.fire('haptic', 'trigger', { type: 'impact' });
      expect(bridge.pendingCount).toBe(0);
    });
  });

  describe('events', () => {
    it('should dispatch events to listeners', () => {
      const handler = vi.fn();
      bridge.on('nfc', 'scanProgress', handler);

      mock.pushEvent('nfc', 'scanProgress', {
        step: 'reading_dg1',
        percent: 40,
      });

      expect(handler).toHaveBeenCalledWith({
        step: 'reading_dg1',
        percent: 40,
      });
    });

    it('should support unsubscribing', () => {
      const handler = vi.fn();
      const unsub = bridge.on('nfc', 'scanProgress', handler);

      unsub();
      mock.pushEvent('nfc', 'scanProgress', {
        step: 'reading_dg1',
        percent: 40,
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bridge.on('nfc', 'scanProgress', handler1);
      bridge.on('nfc', 'scanProgress', handler2);

      mock.pushEvent('nfc', 'scanProgress', { step: 'done', percent: 100 });

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe('destroy', () => {
    it('should reject all pending requests', async () => {
      mock.handle('nfc', 'scan', () => new Promise(() => {}));

      const promise = bridge.request('nfc', 'scan', {});
      bridge.destroy();

      await expect(promise).rejects.toThrow('Bridge destroyed');
    });

    it('should prevent new requests', async () => {
      bridge.destroy();
      await expect(bridge.request('nfc', 'scan', {})).rejects.toThrow(
        'destroyed',
      );
    });

    it('should clear global reference', () => {
      expect(globalThis.SelfNativeBridge).toBe(bridge);
      bridge.destroy();
      expect(globalThis.SelfNativeBridge).toBeUndefined();
    });
  });

  describe('browser host transport', () => {
    beforeEach(() => {
      bridge.destroy();
      const hostTarget = {
        postMessage: vi.fn(),
      } as unknown as Window;

      vi.stubGlobal(
        'window',
        createMockWindow({
          parent: hostTarget,
        }),
      );

      bridge = new WebViewBridge({
        browserHost: {
          targetOrigin: 'https://host.example',
        },
      });
    });

    it('should post lifecycle messages to the host', () => {
      bridge.fire('lifecycle', 'ready', { verificationId: 'verif-1' });
      bridge.fire('lifecycle', 'dismiss', { reason: 'back' });

      const hostTarget = window.parent;
      expect(hostTarget.postMessage).toHaveBeenCalledTimes(2);
      expect(hostTarget.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          type: 'self:ready',
          version: 1,
          payload: { verificationId: 'verif-1' },
        } satisfies SelfHostMessage,
        'https://host.example',
      );
      expect(hostTarget.postMessage).toHaveBeenNthCalledWith(
        2,
        {
          type: 'self:dismiss',
          version: 1,
          payload: { reason: 'back' },
        } satisfies SelfHostMessage,
        'https://host.example',
      );
    });

    it('should emit lifecycle cancel events from the host', () => {
      const handler = vi.fn();
      bridge.on('lifecycle', 'cancel', handler);

      window.__dispatchMessage({
        origin: 'https://host.example',
        source: window.parent,
        data: {
          type: 'self:cancel',
          version: 1,
          payload: { reason: 'user_cancel' },
        },
      } as MessageEvent);

      expect(handler).toHaveBeenCalledWith({ reason: 'user_cancel' });
    });
  });

  describe('message recording', () => {
    it('should record all sent messages', () => {
      mock.handleWith('secureStorage', 'get', { value: 'v' });
      bridge.fire('analytics', 'trackEvent', { event: 'test' });
      bridge.request('secureStorage', 'get', { key: 'k' });

      expect(mock.messages).toHaveLength(2);
      expect(mock.messagesFor('analytics')).toHaveLength(1);
      expect(mock.messagesFor('secureStorage')).toHaveLength(1);
    });
  });
});

function createMockWindow({
  parent,
  opener = null,
}: {
  parent: Window;
  opener?: Window | null;
}): MockWindowWithListeners {
  let messageListener: ((event: MessageEvent) => void) | undefined;

  return {
    parent,
    opener,
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message' && typeof listener === 'function') {
        messageListener = listener as (event: MessageEvent) => void;
      }
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'message' && listener === messageListener) {
        messageListener = undefined;
      }
    }),
    __dispatchMessage(event: MessageEvent) {
      messageListener?.(event);
    },
  } as unknown as MockWindowWithListeners;
}
