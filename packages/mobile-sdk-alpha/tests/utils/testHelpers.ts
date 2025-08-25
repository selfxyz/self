// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* eslint-disable sort-exports/sort-exports */
import type { CryptoAdapter, NetworkAdapter, ScannerAdapter } from '../../src';

// Shared test data
export const sampleMRZ = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
// Intentionally malformed MRZ (invalid structure/check digits) for negative tests
export const invalidMRZ = 'NOT_A_VALID_MRZ';
export const badCheckDigitsMRZ = sampleMRZ.slice(0, -1) + '1';

// Shared mock adapters
export const mockScanner: ScannerAdapter = {
  scan: async () => ({ mode: 'mrz', passportNumber: '', dateOfBirth: '', dateOfExpiry: '' }),
};

export const mockNetwork: NetworkAdapter = {
  // Return a minimal stub to avoid relying on global Response in JSDOM/Node
  http: {
    fetch: async () =>
      ({
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      }) as any,
  },
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
