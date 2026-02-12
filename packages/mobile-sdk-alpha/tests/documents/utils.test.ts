// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import type { AadhaarData, DocumentCatalog } from '@selfxyz/common';
import type { PassportData } from '@selfxyz/common/types/passport';

import type { DocumentsAdapter, SelfClient } from '../../src';
import { createSelfClient, defaultConfig, loadSelectedDocument } from '../../src';
import { storeDocumentWithDeduplication } from '../../src/documents/utils';

const createMockSelfClientWithDocumentsAdapter = (documentsAdapter: DocumentsAdapter): SelfClient => {
  return createSelfClient({
    config: defaultConfig,
    listeners: new Map(),
    adapters: {
      auth: {
        getPrivateKey: async () => null,
      },
      documents: documentsAdapter,
      crypto: {
        hash: async () => new Uint8Array(),
        sign: async () => new Uint8Array(),
      },
      network: {
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
      },
      navigation: {
        goBack: () => {},
        goTo: (_routeName: string, _params?: Record<string, any>) => {},
      },
      scanner: {
        scan: async () => ({
          passportData: {
            mock: true,
          } as any,
        }),
      },
      storage: {
        get: async () => null,
        set: async () => {},
        remove: async () => {},
      },
    },
  });
};
describe('loadSelectedDocument', () => {
  const catalog: DocumentCatalog = {
    documents: [
      { id: '23', documentType: 'passport', documentCategory: 'passport', data: 'data1', mock: true },
      { id: '45', documentType: 'passport', documentCategory: 'passport', data: 'data2', mock: true },
    ],
    selectedDocumentId: undefined,
  };

  const document1: PassportData = {
    mrz: 'mrz1',
    dsc: 'dsc1',
    eContent: [1, 2, 3],
    signedAttr: [1, 2, 3],
    encryptedDigest: [1, 2, 3],
    documentType: 'passport',
    documentCategory: 'passport',
    mock: true,
  };

  it('returns null if no documents in catalog', async () => {
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue({ documents: [] });
    const loadDocumentByIdSpy = vi.fn().mockResolvedValue(null);
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: loadDocumentByIdSpy,
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    const document = await loadSelectedDocument(client);
    expect(document).toBeNull();
    expect(loadDocumentCatalogSpy).toHaveBeenCalled();
    expect(loadDocumentByIdSpy).not.toHaveBeenCalled();
    expect(saveDocumentCatalogSpy).not.toHaveBeenCalled();
  });

  it('automatically selects first document if no selectedDocumentId is set', async () => {
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue(catalog);
    const loadDocumentByIdSpy = vi.fn().mockResolvedValue(document1);
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: loadDocumentByIdSpy,
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    const document = await loadSelectedDocument(client);
    expect(document).toEqual({ data: document1, metadata: catalog.documents[0] });
    expect(loadDocumentCatalogSpy).toHaveBeenCalled();
    expect(loadDocumentByIdSpy).toHaveBeenCalledWith(catalog.documents[0].id);
    expect(saveDocumentCatalogSpy).toHaveBeenCalledWith({ ...catalog, selectedDocumentId: catalog.documents[0].id });
  });

  it('returns null if no document is found by id', async () => {
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue({
      ...catalog,
      selectedDocumentId: 'does-not-exist',
    });
    const loadDocumentByIdSpy = vi.fn().mockResolvedValue(null);
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: loadDocumentByIdSpy,
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    const document = await loadSelectedDocument(client);
    expect(document).toBeNull();
    expect(loadDocumentCatalogSpy).toHaveBeenCalled();
    expect(loadDocumentByIdSpy).not.toHaveBeenCalledWith('does-not-exist');
    expect(saveDocumentCatalogSpy).not.toHaveBeenCalled();
  });

  it('returns null if document exists in catalog but not in storage', async () => {
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue({
      ...catalog,
      selectedDocumentId: '45',
    });
    const loadDocumentByIdSpy = vi.fn().mockResolvedValue(null);
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: loadDocumentByIdSpy,
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    const document = await loadSelectedDocument(client);
    expect(document).toBeNull();
    expect(loadDocumentCatalogSpy).toHaveBeenCalled();
    expect(loadDocumentByIdSpy).toHaveBeenCalledWith('45');
    expect(saveDocumentCatalogSpy).not.toHaveBeenCalled();
  });
});

describe('storeDocumentWithDeduplication', () => {
  const passportDocument = {
    mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<',
    eContent: [1, 2, 3],
    documentType: 'passport',
    documentCategory: 'passport',
  } as PassportData;

  const idCardDocument = {
    mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<',
    eContent: [1, 2, 3],
    documentType: 'id_card',
    documentCategory: 'id_card',
  } as PassportData;

  const aadhaarDocument = {
    qrData: 'test-qr-data',
    documentType: 'aadhaar',
    documentCategory: 'aadhaar',
  } as AadhaarData;

  it('sets hasExpirationDate to true for passport documents', async () => {
    const emptyCatalog: DocumentCatalog = { documents: [] };
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue(emptyCatalog);
    const saveDocumentCatalogSpy = vi.fn();
    const saveDocumentSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: vi.fn(),
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: saveDocumentSpy,
      deleteDocument: vi.fn(),
    });

    await storeDocumentWithDeduplication(client, passportDocument);

    expect(saveDocumentCatalogSpy).toHaveBeenCalledTimes(1);
    const savedCatalog = saveDocumentCatalogSpy.mock.calls[0][0] as DocumentCatalog;

    expect(savedCatalog.documents).toHaveLength(1);
    expect(savedCatalog.documents[0].documentCategory).toBe('passport');
    expect(savedCatalog.documents[0].hasExpirationDate).toBe(true);
  });

  it('sets hasExpirationDate to true for ID card documents', async () => {
    const emptyCatalog: DocumentCatalog = { documents: [] };
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue(emptyCatalog);
    const saveDocumentCatalogSpy = vi.fn();
    const saveDocumentSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: vi.fn(),
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: saveDocumentSpy,
      deleteDocument: vi.fn(),
    });

    await storeDocumentWithDeduplication(client, idCardDocument);

    expect(saveDocumentCatalogSpy).toHaveBeenCalledTimes(1);
    const savedCatalog = saveDocumentCatalogSpy.mock.calls[0][0] as DocumentCatalog;

    expect(savedCatalog.documents).toHaveLength(1);
    expect(savedCatalog.documents[0].documentCategory).toBe('id_card');
    expect(savedCatalog.documents[0].hasExpirationDate).toBe(true);
  });

  it('sets hasExpirationDate to false for Aadhaar documents', async () => {
    const emptyCatalog: DocumentCatalog = { documents: [] };
    const loadDocumentCatalogSpy = vi.fn().mockResolvedValue(emptyCatalog);
    const saveDocumentCatalogSpy = vi.fn();
    const saveDocumentSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: loadDocumentCatalogSpy,
      loadDocumentById: vi.fn(),
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: saveDocumentSpy,
      deleteDocument: vi.fn(),
    });

    await storeDocumentWithDeduplication(client, aadhaarDocument);

    expect(saveDocumentCatalogSpy).toHaveBeenCalledTimes(1);
    const savedCatalog = saveDocumentCatalogSpy.mock.calls[0][0] as DocumentCatalog;

    expect(savedCatalog.documents).toHaveLength(1);
    expect(savedCatalog.documents[0].documentCategory).toBe('aadhaar');
    expect(savedCatalog.documents[0].hasExpirationDate).toBe(false);
  });

  it('infers passport category and sets hasExpirationDate when documentCategory is missing', async () => {
    const docWithoutCategory = {
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<',
      eContent: [1, 2, 3],
      documentType: 'passport',
    } as PassportData;

    const emptyCatalog: DocumentCatalog = { documents: [] };
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: vi.fn().mockResolvedValue(emptyCatalog),
      loadDocumentById: vi.fn(),
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    await storeDocumentWithDeduplication(client, docWithoutCategory);

    const savedCatalog = saveDocumentCatalogSpy.mock.calls[0][0] as DocumentCatalog;
    expect(savedCatalog.documents[0].documentCategory).toBe('passport');
    expect(savedCatalog.documents[0].hasExpirationDate).toBe(true);
  });

  it('infers id_card category and sets hasExpirationDate when documentCategory is missing', async () => {
    const docWithoutCategory = {
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<',
      eContent: [1, 2, 3],
      documentType: 'id_card',
    } as PassportData;

    const emptyCatalog: DocumentCatalog = { documents: [] };
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: vi.fn().mockResolvedValue(emptyCatalog),
      loadDocumentById: vi.fn(),
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    await storeDocumentWithDeduplication(client, docWithoutCategory);

    const savedCatalog = saveDocumentCatalogSpy.mock.calls[0][0] as DocumentCatalog;
    expect(savedCatalog.documents[0].documentCategory).toBe('id_card');
    expect(savedCatalog.documents[0].hasExpirationDate).toBe(true);
  });

  it('infers aadhaar category and sets hasExpirationDate to false when documentCategory is missing', async () => {
    const docWithoutCategory = {
      qrData: 'test-qr-data',
      documentType: 'aadhaar',
    } as AadhaarData;

    const emptyCatalog: DocumentCatalog = { documents: [] };
    const saveDocumentCatalogSpy = vi.fn();

    const client = createMockSelfClientWithDocumentsAdapter({
      loadDocumentCatalog: vi.fn().mockResolvedValue(emptyCatalog),
      loadDocumentById: vi.fn(),
      saveDocumentCatalog: saveDocumentCatalogSpy,
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
    });

    await storeDocumentWithDeduplication(client, docWithoutCategory);

    const savedCatalog = saveDocumentCatalogSpy.mock.calls[0][0] as DocumentCatalog;
    expect(savedCatalog.documents[0].documentCategory).toBe('aadhaar');
    expect(savedCatalog.documents[0].hasExpirationDate).toBe(false);
  });
});
