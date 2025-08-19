/* eslint-disable sort-exports/sort-exports */
import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../../src';

// Shared test data
export const sampleMRZ = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;

// Shared mock adapters
export const mockScanner: ScannerAdapter = {
  scan: async () => ({ mode: 'mrz', passportNumber: '', dateOfBirth: '', dateOfExpiry: '' }),
};

export const mockNetwork: NetworkAdapter = {
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

export const mockCrypto: CryptoAdapter = {
  hash: async () => new Uint8Array(),
  sign: async () => new Uint8Array(),
};

export const mockAdapters = {
  scanner: mockScanner,
  network: mockNetwork,
  crypto: mockCrypto,
};

// Shared test expectations
export const expectedMRZResult = {
  passportNumber: 'L898902C3',
  validation: { overall: true },
};
