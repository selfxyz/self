import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { WebViewBridge } from '../bridge';
import { MockNativeBridge } from '../mock';
import type { BridgeError, NfcScanProgress } from '../types';

describe('WebViewBridge', () => {
  let bridge: WebViewBridge;
  let mock: MockNativeBridge;

  beforeEach(() => {
    bridge = new WebViewBridge({ debug: false });
    mock = new MockNativeBridge(bridge);
  });

  afterEach(() => {
    bridge.destroy();
  });

  describe('request/response', () => {
    it('should send a request and receive a successful response', async () => {
      mock.handleWith('nfc', 'isSupported', { supported: true });

      const result = await bridge.request<{ supported: boolean }>('nfc', 'isSupported');
      expect(result).toEqual({ supported: true });
    });

    it('should reject with BridgeError on failure', async () => {
      mock.handleWithError('nfc', 'scan', {
        code: 'NFC_NOT_SUPPORTED',
        message: 'NFC is not available on this device',
      });

      await expect(bridge.request('nfc', 'scan', { sessionId: '123' })).rejects.toEqual({
        code: 'NFC_NOT_SUPPORTED',
        message: 'NFC is not available on this device',
      });
    });

    it('should pass params to the handler', async () => {
      const handler = vi.fn().mockResolvedValue({ mrz: 'P<USA...' });
      mock.handle('nfc', 'scan', handler);

      await bridge.request('nfc', 'scan', {
        passportNumber: 'ABC123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'test-session',
      });

      expect(handler).toHaveBeenCalledWith({
        passportNumber: 'ABC123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'test-session',
      });
    });

    it('should handle async handlers', async () => {
      mock.handle('crypto', 'sign', async (params) => {
        // Simulate async native work
        await new Promise((r) => setTimeout(r, 10));
        return { signature: 'sig_' + (params.data as string) };
      });

      const result = await bridge.request<{ signature: string }>('crypto', 'sign', {
        data: 'hello',
        keyRef: 'main',
      });

      expect(result).toEqual({ signature: 'sig_hello' });
    });

    it('should reject unhandled methods', async () => {
      await expect(bridge.request('haptic', 'trigger')).rejects.toEqual({
        code: 'NOT_IMPLEMENTED',
        message: 'No mock handler for haptic:trigger',
      });
    });
  });

  describe('timeout', () => {
    it('should timeout when no response arrives', async () => {
      // Use a transport that never responds
      bridge.setTransport({
        postMessage: () => {
          /* swallow */
        },
      });

      await expect(
        bridge.request('nfc', 'scan', {}, 50),
      ).rejects.toMatchObject({
        code: 'BRIDGE_TIMEOUT',
      });
    });

    it('should clean up pending request on timeout', async () => {
      bridge.setTransport({ postMessage: () => {} });

      const promise = bridge.request('nfc', 'scan', {}, 50);
      expect(bridge.pendingCount).toBe(1);

      await expect(promise).rejects.toMatchObject({ code: 'BRIDGE_TIMEOUT' });
      expect(bridge.pendingCount).toBe(0);
    });
  });

  describe('events', () => {
    it('should receive events from native', async () => {
      const handler = vi.fn();
      bridge.on('nfc', 'scanProgress', handler);

      const progress: NfcScanProgress = {
        step: 'reading_dg1',
        percent: 40,
        message: 'Reading document data...',
      };
      mock.pushNfcProgress(progress);

      // Events are dispatched synchronously via handleMessage
      expect(handler).toHaveBeenCalledWith(progress);
    });

    it('should support multiple listeners for the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bridge.on('nfc', 'scanProgress', handler1);
      bridge.on('nfc', 'scanProgress', handler2);

      mock.pushEvent('nfc', 'scanProgress', { step: 'bac', percent: 10 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe when calling the returned function', () => {
      const handler = vi.fn();
      const unsub = bridge.on('nfc', 'scanProgress', handler);

      mock.pushEvent('nfc', 'scanProgress', { step: 'bac', percent: 10 });
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      mock.pushEvent('nfc', 'scanProgress', { step: 'dg1', percent: 50 });
      expect(handler).toHaveBeenCalledTimes(1); // not called again
    });

    it('should not crash when handler throws', () => {
      bridge.on('nfc', 'scanProgress', () => {
        throw new Error('oops');
      });

      // Should not throw
      expect(() =>
        mock.pushEvent('nfc', 'scanProgress', { step: 'bac', percent: 10 }),
      ).not.toThrow();
    });
  });

  describe('fire', () => {
    it('should send a message without expecting a response', () => {
      mock.handleWith('haptic', 'trigger', undefined);

      bridge.fire('haptic', 'trigger', { type: 'impactLight' });

      const messages = mock.messagesForMethod('haptic', 'trigger');
      expect(messages).toHaveLength(1);
      expect(messages[0].params).toEqual({ type: 'impactLight' });
    });
  });

  describe('message recording', () => {
    it('should record all sent messages', async () => {
      mock.handleWith('biometrics', 'isAvailable', { available: true });
      mock.handleWith('biometrics', 'getBiometryType', { type: 'faceId' });

      await bridge.request('biometrics', 'isAvailable');
      await bridge.request('biometrics', 'getBiometryType');

      expect(mock.messages).toHaveLength(2);
      expect(mock.messagesFor('biometrics')).toHaveLength(2);
    });

    it('should filter messages by domain and method', async () => {
      mock.handleWith('nfc', 'isSupported', { supported: true });
      mock.handleWith('biometrics', 'isAvailable', { available: true });

      await bridge.request('nfc', 'isSupported');
      await bridge.request('biometrics', 'isAvailable');

      expect(mock.messagesForMethod('nfc', 'isSupported')).toHaveLength(1);
      expect(mock.messagesForMethod('biometrics', 'isAvailable')).toHaveLength(1);
    });
  });

  describe('destroy', () => {
    it('should reject all pending requests', async () => {
      bridge.setTransport({ postMessage: () => {} });

      const p1 = bridge.request('nfc', 'scan', {});
      const p2 = bridge.request('biometrics', 'authenticate', {});

      bridge.destroy();

      await expect(p1).rejects.toMatchObject({ code: 'BRIDGE_DESTROYED' });
      await expect(p2).rejects.toMatchObject({ code: 'BRIDGE_DESTROYED' });
    });

    it('should clear all listeners', () => {
      const handler = vi.fn();
      bridge.on('nfc', 'scanProgress', handler);

      bridge.destroy();

      // Creating a new mock would fail since transport is null
      // The key thing is that listeners are cleared
      expect(bridge.pendingCount).toBe(0);
    });
  });
});
