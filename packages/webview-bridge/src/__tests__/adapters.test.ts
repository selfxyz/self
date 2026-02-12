import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { WebViewBridge } from '../bridge';
import { MockNativeBridge } from '../mock';
import { bridgeNFCScannerAdapter, onNfcProgress } from '../adapters/nfc-scanner';
import { bridgeCryptoAdapter } from '../adapters/crypto';
import { bridgeAuthAdapter } from '../adapters/auth';
import { bridgeDocumentsAdapter } from '../adapters/documents';
import { bridgeStorageAdapter } from '../adapters/storage';
import { bridgeAnalyticsAdapter } from '../adapters/analytics';
import { bridgeHapticAdapter } from '../adapters/haptic';
import { webNavigationAdapter } from '../adapters/navigation';
import { bridgeLifecycleAdapter } from '../adapters/lifecycle';

describe('Bridge Adapters', () => {
  let bridge: WebViewBridge;
  let mock: MockNativeBridge;

  beforeEach(() => {
    bridge = new WebViewBridge({ debug: false });
    mock = new MockNativeBridge(bridge);
  });

  afterEach(() => {
    bridge.destroy();
  });

  describe('NFCScannerAdapter', () => {
    it('should route scan request through bridge', async () => {
      const passportData = {
        passportData: {
          mrz: 'P<USASMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<',
          dsc: '-----BEGIN CERTIFICATE-----...',
          dg1Hash: [1, 2, 3],
          dg2Hash: [4, 5, 6],
          dgPresents: [1, 2],
          eContent: [7, 8, 9],
          signedAttr: [10, 11],
          encryptedDigest: [12, 13],
          documentType: 'passport',
          documentCategory: 'passport',
          parsed: false,
          mock: false,
        },
      };

      mock.handleWith('nfc', 'scan', passportData);

      const adapter = bridgeNFCScannerAdapter(bridge);
      const result = await adapter.scan({
        passportNumber: 'ABC123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'test',
      });

      expect(result.passportData.mrz).toContain('SMITH');
      expect(mock.messagesForMethod('nfc', 'scan')).toHaveLength(1);
    });

    it('should cancel scan on abort signal', async () => {
      mock.handle('nfc', 'scan', () => new Promise(() => {})); // never resolves

      const adapter = bridgeNFCScannerAdapter(bridge);
      const controller = new AbortController();

      const scanPromise = adapter.scan({
        passportNumber: 'ABC123',
        dateOfBirth: '900101',
        dateOfExpiry: '300101',
        sessionId: 'test',
        signal: controller.signal,
      });

      // Abort after a short delay
      setTimeout(() => controller.abort(), 10);

      await expect(scanPromise).rejects.toMatchObject({ code: 'SCAN_ABORTED' });
      expect(mock.messagesForMethod('nfc', 'cancelScan')).toHaveLength(1);
    });

    it('should receive NFC progress events', () => {
      const handler = vi.fn();
      onNfcProgress(bridge, handler);

      mock.pushNfcProgress({ step: 'bac', percent: 10, message: 'Authenticating' });
      mock.pushNfcProgress({ step: 'reading_dg1', percent: 40 });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith({ step: 'bac', percent: 10, message: 'Authenticating' });
    });
  });

  describe('CryptoAdapter', () => {
    it('should hash using Web Crypto API (no bridge call)', async () => {
      const adapter = bridgeCryptoAdapter(bridge);
      const input = new TextEncoder().encode('hello');
      const hash = await adapter.hash(input, 'sha256');

      // SHA-256 of "hello" is well-known
      expect(hash).toBeInstanceOf(Uint8Array);
      expect(hash.length).toBe(32);

      // No bridge messages should have been sent
      expect(mock.messages).toHaveLength(0);
    });

    it('should route sign through bridge', async () => {
      mock.handleWith('crypto', 'sign', { signature: 'c2lnbmF0dXJl' }); // base64 "signature"

      const adapter = bridgeCryptoAdapter(bridge);
      const data = new TextEncoder().encode('data');
      const sig = await adapter.sign(data, 'main-key');

      expect(sig).toBeInstanceOf(Uint8Array);
      expect(mock.messagesForMethod('crypto', 'sign')).toHaveLength(1);
    });
  });

  describe('AuthAdapter', () => {
    it('should return private key from bridge', async () => {
      mock.handleWith('secureStorage', 'get', { privateKey: '0xabc123' });

      const adapter = bridgeAuthAdapter(bridge);
      const key = await adapter.getPrivateKey();

      expect(key).toBe('0xabc123');
    });

    it('should return null when key not provisioned', async () => {
      mock.handleWithError('secureStorage', 'get', {
        code: 'KEY_NOT_FOUND',
        message: 'No key found',
      });

      const adapter = bridgeAuthAdapter(bridge);
      const key = await adapter.getPrivateKey();

      expect(key).toBeNull();
    });
  });

  describe('DocumentsAdapter', () => {
    it('should load document catalog', async () => {
      mock.handleWith('documents', 'loadCatalog', { docs: ['id1'] });

      const adapter = bridgeDocumentsAdapter(bridge);
      const catalog = await adapter.loadDocumentCatalog();

      expect(catalog).toEqual({ docs: ['id1'] });
    });

    it('should save document', async () => {
      mock.handleWith('documents', 'save', { success: true });

      const adapter = bridgeDocumentsAdapter(bridge);
      await adapter.saveDocument('doc-1', { mrz: 'P<...' });

      const msgs = mock.messagesForMethod('documents', 'save');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].params).toMatchObject({ id: 'doc-1' });
    });

    it('should delete document', async () => {
      mock.handleWith('documents', 'delete', { success: true });

      const adapter = bridgeDocumentsAdapter(bridge);
      await adapter.deleteDocument('doc-1');

      expect(mock.messagesForMethod('documents', 'delete')).toHaveLength(1);
    });
  });

  describe('StorageAdapter', () => {
    it('should get value', async () => {
      mock.handleWith('secureStorage', 'get', 'stored-value');

      const adapter = bridgeStorageAdapter(bridge);
      const val = await adapter.get('myKey');

      expect(val).toBe('stored-value');
    });

    it('should set value', async () => {
      mock.handleWith('secureStorage', 'set', { success: true });

      const adapter = bridgeStorageAdapter(bridge);
      await adapter.set('myKey', 'myValue');

      const msgs = mock.messagesForMethod('secureStorage', 'set');
      expect(msgs[0].params).toMatchObject({ key: 'myKey', value: 'myValue' });
    });

    it('should remove value', async () => {
      mock.handleWith('secureStorage', 'remove', { success: true });

      const adapter = bridgeStorageAdapter(bridge);
      await adapter.remove('myKey');

      expect(mock.messagesForMethod('secureStorage', 'remove')).toHaveLength(1);
    });
  });

  describe('AnalyticsAdapter', () => {
    it('should fire trackEvent without waiting', () => {
      const adapter = bridgeAnalyticsAdapter(bridge);
      adapter.trackEvent?.('onboarding_complete', { duration_seconds: 30 });

      expect(mock.messagesForMethod('analytics', 'trackEvent')).toHaveLength(1);
    });

    it('should fire trackNfcEvent without waiting', () => {
      const adapter = bridgeAnalyticsAdapter(bridge);
      adapter.trackNfcEvent?.('nfc_scan_start', { device: 'pixel' });

      expect(mock.messagesForMethod('analytics', 'trackNfcEvent')).toHaveLength(1);
    });
  });

  describe('HapticAdapter', () => {
    it('should fire haptic trigger without waiting', () => {
      const adapter = bridgeHapticAdapter(bridge);
      adapter.trigger('impactLight');

      const msgs = mock.messagesForMethod('haptic', 'trigger');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].params).toEqual({ type: 'impactLight' });
    });
  });

  describe('NavigationAdapter', () => {
    it('should navigate to route', () => {
      const navigate = vi.fn();
      const goBack = vi.fn();
      const adapter = webNavigationAdapter(navigate, goBack);

      adapter.goTo('Home');
      expect(navigate).toHaveBeenCalledWith('/', undefined);

      adapter.goTo('CountryPicker', { preselected: 'US' });
      expect(navigate).toHaveBeenCalledWith('/onboarding/country', { preselected: 'US' });
    });

    it('should go back', () => {
      const navigate = vi.fn();
      const goBack = vi.fn();
      const adapter = webNavigationAdapter(navigate, goBack);

      adapter.goBack();
      expect(goBack).toHaveBeenCalled();
    });
  });

  describe('LifecycleAdapter', () => {
    it('should fire ready event', () => {
      const adapter = bridgeLifecycleAdapter(bridge);
      adapter.ready();

      expect(mock.messagesForMethod('lifecycle', 'ready')).toHaveLength(1);
    });

    it('should fire dismiss event', () => {
      const adapter = bridgeLifecycleAdapter(bridge);
      adapter.dismiss();

      expect(mock.messagesForMethod('lifecycle', 'dismiss')).toHaveLength(1);
    });

    it('should send result and await response', async () => {
      mock.handleWith('lifecycle', 'setResult', { acknowledged: true });

      const adapter = bridgeLifecycleAdapter(bridge);
      await adapter.setResult({
        success: true,
        userId: 'user-123',
        verificationId: 'verify-456',
      });

      const msgs = mock.messagesForMethod('lifecycle', 'setResult');
      expect(msgs).toHaveLength(1);
      expect(msgs[0].params).toMatchObject({
        success: true,
        userId: 'user-123',
      });
    });
  });
});
