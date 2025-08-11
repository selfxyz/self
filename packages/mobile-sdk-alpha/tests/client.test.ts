import { describe, expect, it, vi } from 'vitest';

import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../src/adapters/index';
import { createSelfClient } from '../src/index';

describe('createSelfClient', () => {
  // Test eager validation during client creation
  it('throws when scanner adapter missing during creation', () => {
    expect(() => createSelfClient({ config: {}, adapters: {} })).toThrow('scanner adapter not provided');
  });

  it('throws when network adapter missing during creation', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, crypto } })).toThrow(
      'network adapter not provided',
    );
  });

  it('throws when crypto adapter missing during creation', () => {
    expect(() => createSelfClient({ config: {}, adapters: { scanner, network } })).toThrow(
      'crypto adapter not provided',
    );
  });

  it('creates client successfully with all required adapters', () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto } });
    expect(client).toBeTruthy();
  });

  it('scans document with provided adapter', async () => {
    const scanMock = vi.fn().mockResolvedValue({ mode: 'qr', data: 'self://ok' });
    const client = createSelfClient({
      config: {},
      adapters: { scanner: { scan: scanMock }, network, crypto },
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
      adapters: { scanner: { scan: scanMock }, network, crypto },
    });
    await expect(client.scanDocument({ mode: 'qr' })).rejects.toBe(err);
  });

  it('returns stub proof handle when adapters provided', async () => {
    const network = { http: { fetch: vi.fn() }, ws: { connect: vi.fn() } } as any;
    const crypto = { hash: vi.fn(), sign: vi.fn() } as any;
    const scanner = { scan: vi.fn() } as any;
    const client = createSelfClient({ config: {}, adapters: { network, crypto, scanner } });
    const handle = await client.generateProof({ type: 'register', payload: {} });
    expect(handle.id).toBe('stub');
    expect(handle.status).toBe('pending');
    expect(await handle.result()).toEqual({ ok: false, reason: 'SELF_ERR_PROOF_STUB' });
    expect(() => handle.cancel()).not.toThrow();
  });

  it('emits and unsubscribes events', () => {
    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto } });
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
