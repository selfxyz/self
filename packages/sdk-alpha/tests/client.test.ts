import { describe, expect, it } from 'vitest';

import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../src/adapters/index.js';
import { createSelfClient } from '../src/client.js';

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
