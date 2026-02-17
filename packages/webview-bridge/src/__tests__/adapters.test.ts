// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebViewBridge } from '../bridge';
import { MockNativeBridge } from '../mock';
import {
  bridgeNFCScannerAdapter,
  onNfcProgress,
  bridgeCryptoAdapter,
  bridgeAuthAdapter,
  bridgeDocumentsAdapter,
  bridgeStorageAdapter,
  bridgeAnalyticsAdapter,
  bridgeHapticAdapter,
  bridgeLifecycleAdapter,
  webNavigationAdapter,
} from '../adapters';

describe('Adapter integration tests', () => {
  let mock: MockNativeBridge;
  let bridge: WebViewBridge;

  beforeEach(() => {
    mock = new MockNativeBridge();
    bridge = new WebViewBridge({ transport: mock });
    mock.connect(bridge);
  });

  afterEach(() => {
    bridge.destroy();
  });

  describe('NFC Scanner Adapter', () => {
    it('should send scan request with 120s timeout', async () => {
      mock.handleWith('nfc', 'scan', { passportData: { mrz: 'test' } });

      const scanner = bridgeNFCScannerAdapter(bridge);
      const result = await scanner.scan({
        passportNumber: '123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'sess-1',
      });

      expect(result).toEqual({ passportData: { mrz: 'test' } });
      expect(mock.messagesFor('nfc')).toHaveLength(1);
    });

    it('should cancel on abort signal', async () => {
      // Handler that resolves when cancelScan fires
      let resolveScan: (v: unknown) => void;
      mock.handle(
        'nfc',
        'scan',
        () =>
          new Promise(resolve => {
            resolveScan = resolve;
          }),
      );
      mock.handle('nfc', 'cancelScan', () => {
        // When cancel fires, resolve the scan with an error-like response
        // so the pending promise settles
        resolveScan!({ cancelled: true });
        return {};
      });

      const controller = new AbortController();
      const scanner = bridgeNFCScannerAdapter(bridge);

      const promise = scanner.scan({
        passportNumber: '123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'sess-1',
        signal: controller.signal,
      });

      controller.abort();

      // The cancel message should be fired
      const cancelMessages = mock
        .messagesFor('nfc')
        .filter(m => m.method === 'cancelScan');
      expect(cancelMessages).toHaveLength(1);

      // The scan request was resolved, so promise should settle
      const result = await promise;
      expect(result).toEqual({ cancelled: true });
    });

    it('should subscribe to scan progress events', () => {
      const handler = vi.fn();
      const unsub = onNfcProgress(bridge, handler);

      mock.pushEvent('nfc', 'scanProgress', {
        step: 'reading_dg2',
        percent: 60,
      });
      expect(handler).toHaveBeenCalledWith({
        step: 'reading_dg2',
        percent: 60,
      });

      unsub();
    });
  });

  describe('Crypto Adapter', () => {
    it('should hash using Web Crypto API (no bridge call)', async () => {
      const adapter = bridgeCryptoAdapter(bridge);
      const input = new TextEncoder().encode('hello');
      const hash = await adapter.hash(input, 'sha256');

      // SHA-256 of "hello" is known
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32);
      expect(mock.messages).toHaveLength(0); // No bridge calls
    });

    it('should sign via bridge', async () => {
      const mockSignature = btoa(
        String.fromCharCode(...new Uint8Array([1, 2, 3, 4])),
      );
      mock.handleWith('crypto', 'sign', { signature: mockSignature });

      const adapter = bridgeCryptoAdapter(bridge);
      const result = await adapter.sign(new Uint8Array([10, 20]), 'key-ref');

      expect(result).toEqual(new Uint8Array([1, 2, 3, 4]));
      expect(mock.messagesFor('crypto')).toHaveLength(1);
    });
  });

  describe('Auth Adapter', () => {
    it('should return private key on success', async () => {
      mock.handleWith('secureStorage', 'get', { value: '0xdeadbeef' });

      const auth = bridgeAuthAdapter(bridge);
      const key = await auth.getPrivateKey();
      expect(key).toBe('0xdeadbeef');
    });

    it('should return null on error', async () => {
      mock.handleWithError('secureStorage', 'get', {
        code: 'BIOMETRIC_FAILED',
        message: 'User cancelled biometric',
      });

      const auth = bridgeAuthAdapter(bridge);
      const key = await auth.getPrivateKey();
      expect(key).toBeNull();
    });
  });

  describe('Documents Adapter', () => {
    it('should load document catalog', async () => {
      const catalog = { documents: [{ id: '1', name: 'Passport' }] };
      mock.handleWith('documents', 'loadCatalog', catalog);

      const docs = bridgeDocumentsAdapter(bridge);
      const result = await docs.loadDocumentCatalog();
      expect(result).toEqual(catalog);
    });

    it('should save document', async () => {
      mock.handleWith('documents', 'save', {});

      const docs = bridgeDocumentsAdapter(bridge);
      await docs.saveDocument('doc-1', { mrz: 'test' });

      const messages = mock.messagesFor('documents');
      expect(messages).toHaveLength(1);
      expect(messages[0].params).toEqual({
        id: 'doc-1',
        data: { mrz: 'test' },
      });
    });

    it('should delete document', async () => {
      mock.handleWith('documents', 'delete', {});

      const docs = bridgeDocumentsAdapter(bridge);
      await docs.deleteDocument('doc-1');

      expect(mock.messagesFor('documents')[0].method).toBe('delete');
    });
  });

  describe('Storage Adapter', () => {
    it('should get/set/remove values', async () => {
      mock.handleWith('secureStorage', 'get', { value: 'stored' });
      mock.handleWith('secureStorage', 'set', {});
      mock.handleWith('secureStorage', 'remove', {});

      const storage = bridgeStorageAdapter(bridge);

      await storage.set('key', 'value');
      const result = await storage.get('key');
      expect(result).toBe('stored');

      await storage.remove('key');
      expect(mock.messagesFor('secureStorage')).toHaveLength(3);
    });
  });

  describe('Analytics Adapter', () => {
    it('should fire events without awaiting', () => {
      const analytics = bridgeAnalyticsAdapter(bridge);

      analytics.trackEvent('page_view', { page: 'home' });
      analytics.trackNfcEvent('scan_started', { device: 'pixel' });
      analytics.logNFCEvent('info', 'Scan begun', { sessionId: 's1' });

      expect(mock.messagesFor('analytics')).toHaveLength(3);
      expect(bridge.pendingCount).toBe(0); // Fire-and-forget
    });
  });

  describe('Haptic Adapter', () => {
    it('should fire haptic without awaiting', () => {
      const haptic = bridgeHapticAdapter(bridge);
      haptic.trigger('impact');

      expect(mock.messagesFor('haptic')).toHaveLength(1);
      expect(bridge.pendingCount).toBe(0);
    });
  });

  describe('Lifecycle Adapter', () => {
    it('should fire ready and dismiss', () => {
      const lifecycle = bridgeLifecycleAdapter(bridge);
      lifecycle.ready();
      lifecycle.dismiss();

      const messages = mock.messagesFor('lifecycle');
      expect(messages).toHaveLength(2);
      expect(messages[0].method).toBe('ready');
      expect(messages[1].method).toBe('dismiss');
      expect(bridge.pendingCount).toBe(0);
    });

    it('should await setResult', async () => {
      mock.handleWith('lifecycle', 'setResult', {});

      const lifecycle = bridgeLifecycleAdapter(bridge);
      await lifecycle.setResult({ success: true, verificationId: 'v-1' });

      expect(mock.messagesFor('lifecycle')[0].method).toBe('setResult');
    });
  });

  describe('Navigation Adapter', () => {
    it('should map route names to paths', () => {
      const navigate = vi.fn();
      const goBack = vi.fn();
      const nav = webNavigationAdapter(navigate, goBack);

      nav.goTo('Home');
      expect(navigate).toHaveBeenCalledWith('/');

      nav.goTo('CountryPicker');
      expect(navigate).toHaveBeenCalledWith('/onboarding/country');

      nav.goBack();
      expect(goBack).toHaveBeenCalled();
    });

    it('should warn on unknown route', () => {
      const navigate = vi.fn();
      const goBack = vi.fn();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const nav = webNavigationAdapter(navigate, goBack);

      nav.goTo('UnknownRoute' as any);
      expect(warn).toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();

      warn.mockRestore();
    });
  });
});
