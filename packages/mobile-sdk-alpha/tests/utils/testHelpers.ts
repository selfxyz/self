// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* eslint-disable sort-exports/sort-exports */
import type { NavigationAdapter } from 'src/types/public';

import type { CryptoAdapter, DocumentsAdapter, NetworkAdapter, NFCScannerAdapter } from '../../src';

// Shared test data
export const sampleMRZ = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
// Intentionally malformed MRZ (invalid structure/check digits) for negative tests
export const invalidMRZ = 'NOT_A_VALID_MRZ';
export const badCheckDigitsMRZ = sampleMRZ.slice(0, -1) + '1';

// Shared mock adapters
export const mockScanner: NFCScannerAdapter = {
  scan: async () => ({
    passportData: {
      mock: true,
    } as any,
  }),
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

export const mockDocuments: DocumentsAdapter = {
  loadDocumentCatalog: async () => ({ documents: [] }),
  loadDocumentById: async () => null,
  saveDocumentCatalog: () => Promise.resolve(),
  saveDocument: () => Promise.resolve(),
  deleteDocument: () => Promise.resolve(),
};

const mockAuth = {
  getPrivateKey: async () => 'stubbed-private-key',
};

const mockNavigation: NavigationAdapter = {
  goBack: vi.fn(),
  goTo: vi.fn(),
};

export const mockAdapters = {
  scanner: mockScanner,
  network: mockNetwork,
  crypto: mockCrypto,
  documents: mockDocuments,
  auth: mockAuth,
  navigation: mockNavigation,
};

// Shared test expectations
export const expectedMRZResult = {
  documentNumber: 'L898902C3',
  validation: { overall: true },
};
