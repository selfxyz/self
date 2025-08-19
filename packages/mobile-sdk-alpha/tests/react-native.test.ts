import { describe, expect, it } from 'vitest';

import { createSelfClient } from '../src/index';

describe('main entry', () => {
  it('exposes createSelfClient', () => {
    expect(typeof createSelfClient).toBe('function');
  });

  it('parses MRZ via client API', () => {
    const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;

    const scanner = {
      scan: async () => ({ mode: 'mrz' as const, passportNumber: '', dateOfBirth: '', dateOfExpiry: '' }),
    };

    const network = {
      // Return a minimal stub to avoid relying on global Response in JSDOM/Node
      http: { fetch: async () => ({ ok: true }) as any },
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

    const crypto = {
      hash: async () => new Uint8Array(),
      sign: async () => new Uint8Array(),
    };

    const client = createSelfClient({ config: {}, adapters: { scanner, network, crypto } });
    const info = client.extractMRZInfo(sample);
    expect(info.passportNumber).toBe('L898902C3');
    expect(info.validation.overall).toBe(true);
  });
});
