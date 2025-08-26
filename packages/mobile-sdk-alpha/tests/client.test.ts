// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import type { CryptoAdapter, DocumentsAdapter, NetworkAdapter, ScannerAdapter } from '../src';
import { createSelfClient } from '../src/index';

describe('createSelfClient', () => {
  // Test eager validation during client creation
  it('throws when scanner adapter missing during creation', () => {
    expect(() =>
      createSelfClient({
        config: {},
        adapters: {
          documents,
          network,
          crypto,
        },
      }),
    ).toThrow('scanner adapter not provided');
  });

  it('throws when network adapter missing during creation', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, crypto, documents } })).toThrow(
      'network adapter not provided',
    );
  });

  it('throws when crypto adapter missing during creation', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, network, documents } })).toThrow(
      'crypto adapter not provided',
    );
  });

  it('throws when documents adapter missing during creation', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, network, crypto } })).toThrow(
      'documents adapter not provided',
    );
  });

  it('creates client successfully with all required adapters', () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto, documents } });
    expect(client).toBeTruthy();
  });

  it('scans document with provided adapter', async () => {
    const scanMock = vi.fn().mockResolvedValue({ mode: 'qr', data: 'self://ok' });
    const client = createSelfClient({
      config: {},
      adapters: { scanner: { scan: scanMock }, network, crypto, documents },
    });
    const result = await client.scanDocument({ mode: 'qr' });
    expect(result).toEqual({ mode: 'qr', data: 'self://ok' });
    expect(scanMock).toHaveBeenCalledWith({ mode: 'qr' });
  });

  it('propagates scanner errors', async () => {
    const err = new Error('scan failed');
    const scanMock = vi.fn().mockRejectedValue(err);
    const client = createSelfClient({
      config: {},
      adapters: { scanner: { scan: scanMock }, network, crypto, documents },
    });
    await expect(client.scanDocument({ mode: 'qr' })).rejects.toBe(err);
  });

  it('returns stub proof handle when adapters provided', async () => {
    const network = { http: { fetch: vi.fn() }, ws: { connect: vi.fn() } } as any;
    const crypto = { hash: vi.fn(), sign: vi.fn() } as any;
    const scanner = { scan: vi.fn() } as any;
    const client = createSelfClient({ config: {}, adapters: { network, crypto, scanner, documents } });
    const handle = await client.generateProof({ type: 'register', payload: {} });
    expect(handle.id).toBe('stub');
    expect(handle.status).toBe('pending');
    expect(await handle.result()).toEqual({ ok: false, reason: 'SELF_ERR_PROOF_STUB' });
    expect(() => handle.cancel()).not.toThrow();
  });

  it('emits and unsubscribes events', () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto, documents } });
    const cb = vi.fn();
    const originalSet = Map.prototype.set;
    let eventSet: Set<(p: any) => void> | undefined;
    Map.prototype.set = function (key: any, value: any) {
      if (key === 'progress') eventSet = value;
      return originalSet.call(this, key, value);
    };
    const unsub = client.on('progress', cb);
    Map.prototype.set = originalSet;

    eventSet?.forEach(fn => fn({ step: 'one' }));
    expect(cb).toHaveBeenCalledWith({ step: 'one' });
    unsub();
    eventSet?.forEach(fn => fn({ step: 'two' }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('parses MRZ via client', () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto, documents } });
    const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
    const info = client.extractMRZInfo(sample);
    expect(info.passportNumber).toBe('L898902C3');
    expect(info.validation.overall).toBe(true);
  });

  it('returns stub registration status', async () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto, documents } });
    await expect(client.registerDocument({} as any)).resolves.toEqual({
      registered: false,
      reason: 'SELF_REG_STATUS_STUB',
    });
  });
  describe('when analytics adapter is given', () => {
    it('calls that adapter for trackEvent', () => {
      const trackEvent = vi.fn();
      const client = createSelfClient({
        config: {},
        adapters: { scanner, network, crypto, analytics: { trackEvent }, documents },
      });

      client.trackEvent('test_event');
      expect(trackEvent).toHaveBeenCalledWith('test_event', undefined);
      client.trackEvent('another_event', { foo: 'bar' });
      expect(trackEvent).toHaveBeenCalledWith('another_event', { foo: 'bar' });
    });
  });
});

const scanner: ScannerAdapter = {
  scan: async () => ({ mode: 'qr', data: 'stub' }),
};

const network: NetworkAdapter = {
  http: { fetch: async () => new Response(null) },
  ws: {
    connect: () => ({
      send: () => {},
      close: () => {},
      onMessage: () => {},
      onError: () => {},
      onClose: () => {},
    }),
  },
};

const crypto: CryptoAdapter = {
  hash: async () => new Uint8Array(),
  sign: async () => new Uint8Array(),
};

const documents: DocumentsAdapter = {
  loadDocumentCatalog: async () => ({ documents: [] }),
  loadDocumentById: async () => null,
};
