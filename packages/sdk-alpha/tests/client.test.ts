import { describe, expect, it, vi } from 'vitest';

import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../src/adapters/index.js';
import { createSelfClient } from '../src/index.js';

describe('createSelfClient', () => {
  it('throws when scanner adapter missing', async () => {
    const client = createSelfClient({ config: {}, adapters: {} });
    await expect(client.scanDocument({ mode: 'qr' } as any)).rejects.toMatchObject({
      code: 'SELF_ERR_ADAPTER_MISSING',
      category: 'config',
    });
  });

  it('scans document with provided adapter', async () => {
    const scanMock = vi.fn().mockResolvedValue({ mode: 'qr', data: 'self://ok' });
    const client = createSelfClient({
      config: {},
      adapters: { scanner: { scan: scanMock } },
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
      adapters: { scanner: { scan: scanMock } },
    });
    await expect(client.scanDocument({ mode: 'qr' })).rejects.toBe(err);
  });

  it('throws when network adapter missing for checkRegistration', async () => {
    const client = createSelfClient({ config: {}, adapters: {} });
    await expect(client.checkRegistration({ scan: { mode: 'qr', data: 'self://a' } } as any)).rejects.toMatchObject({
      code: 'SELF_ERR_ADAPTER_MISSING',
    });
  });

  it('throws when network adapter missing for proof generation', async () => {
    const crypto = { hash: vi.fn(), sign: vi.fn() } as any;
    const client = createSelfClient({ config: {}, adapters: { crypto } });
    await expect(client.generateProof({ type: 'register', payload: {} })).rejects.toMatchObject({
      code: 'SELF_ERR_ADAPTER_MISSING',
    });
  });

  it('throws when crypto adapter missing for proof generation', async () => {
    const network = { http: { fetch: vi.fn() }, ws: { connect: vi.fn() } } as any;
    const client = createSelfClient({ config: {}, adapters: { network } });
    await expect(client.generateProof({ type: 'register', payload: {} })).rejects.toMatchObject({
      code: 'SELF_ERR_ADAPTER_MISSING',
    });
  });

  it('returns stub proof handle when adapters provided', async () => {
    const network = { http: { fetch: vi.fn() }, ws: { connect: vi.fn() } } as any;
    const crypto = { hash: vi.fn(), sign: vi.fn() } as any;
    const client = createSelfClient({ config: {}, adapters: { network, crypto } });
    const handle = await client.generateProof({ type: 'register', payload: {} });
    expect(handle.id).toBe('stub');
    expect(handle.status).toBe('pending');
    expect(await handle.result()).toEqual({ ok: false, reason: 'SELF_ERR_PROOF_STUB' });
    expect(() => handle.cancel()).not.toThrow();
  });

  it('emits and unsubscribes events', () => {
    const client = createSelfClient({ config: {}, adapters: {} });
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

describe('createSelfClient', () => {
  it('throws if scanner adapter missing', () => {
    expect(() => createSelfClient({ config: {}, adapters: { network, crypto } })).toThrow(
      'scanner adapter not provided',
    );
  });

  it('throws if network adapter missing', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, crypto } })).toThrow(
      'network adapter not provided',
    );
  });

  it('throws if crypto adapter missing', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, network } })).toThrow(
      'crypto adapter not provided',
    );
  });

  it('creates client with required adapters and no optional ones', () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto } });
    expect(client).toBeTruthy();
  });
});
