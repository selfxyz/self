// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/* eslint-disable sort-exports/sort-exports */

import type {
  AuthAdapter,
  CryptoAdapter,
  DocumentsAdapter,
  NetworkAdapter,
  ScannerAdapter,
} from '@selfxyz/mobile-sdk-alpha';

export const mockCrypto: CryptoAdapter = {
  hash: async () => new Uint8Array(),
  sign: async () => new Uint8Array(),
};

export const mockDocuments: DocumentsAdapter = {
  loadDocumentCatalog: async () => ({ documents: [] }),
  loadDocumentById: async () => null,
  saveDocumentCatalog: async () => {},
};

export const mockNetwork: NetworkAdapter = {
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

export const mockScanner: ScannerAdapter = {
  scan: async () => ({
    mode: 'mrz',
    passportNumber: '',
    dateOfBirth: '',
    dateOfExpiry: '',
  }),
};

export const mockAuth: AuthAdapter = {
  getPrivateKey: async () => '0x-mock-private-key',
};

export const mockAdapters = {
  auth: mockAuth,
  scanner: mockScanner,
  network: mockNetwork,
  crypto: mockCrypto,
  documents: mockDocuments,
};
