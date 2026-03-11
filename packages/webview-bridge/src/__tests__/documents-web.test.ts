// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const engineBrowserMocks = vi.hoisted(() => ({
  createIndexedDBDocumentsAdapter: vi.fn(),
  createNoOpHapticAdapter: vi.fn(),
  createWebAnalyticsAdapter: vi.fn(),
  createWebCryptoAdapter: vi.fn(),
}));

vi.mock('@selfxyz/mobile-sdk-alpha/adapters/browser', () => engineBrowserMocks);

import { indexedDBDocumentsAdapter } from '../adapters';
import type { BridgeDocumentsAdapter } from '../adapters/documents';

describe('indexedDBDocumentsAdapter', () => {
  let adapter: BridgeDocumentsAdapter;
  const loadDocumentCatalog = vi.fn();
  const saveDocumentCatalog = vi.fn();
  const loadDocumentById = vi.fn();
  const saveDocument = vi.fn();
  const deleteDocument = vi.fn();

  beforeEach(() => {
    loadDocumentCatalog.mockReset();
    saveDocumentCatalog.mockReset();
    loadDocumentById.mockReset();
    saveDocument.mockReset();
    deleteDocument.mockReset();

    engineBrowserMocks.createIndexedDBDocumentsAdapter.mockReset();
    engineBrowserMocks.createIndexedDBDocumentsAdapter.mockReturnValue({
      loadDocumentCatalog,
      saveDocumentCatalog,
      loadDocumentById,
      saveDocument,
      deleteDocument,
    });

    adapter = indexedDBDocumentsAdapter();
  });

  it('should delegate creation to the engine factory', () => {
    expect(engineBrowserMocks.createIndexedDBDocumentsAdapter).toHaveBeenCalledTimes(1);
  });

  it('should return empty catalog when none exists', async () => {
    loadDocumentCatalog.mockResolvedValue({ documents: [] });

    const catalog = await adapter.loadDocumentCatalog();

    expect(catalog).toEqual({ documents: [] });
    expect(loadDocumentCatalog).toHaveBeenCalledTimes(1);
  });

  it('should save and load a document catalog', async () => {
    const catalog = { documents: [{ id: 'doc-1', type: 'passport' }] };
    loadDocumentCatalog.mockResolvedValue(catalog);

    await adapter.saveDocumentCatalog(catalog);
    const loaded = await adapter.loadDocumentCatalog();

    expect(saveDocumentCatalog).toHaveBeenCalledWith(catalog);
    expect(loaded).toEqual(catalog);
  });

  it('should return null for non-existent document', async () => {
    loadDocumentById.mockResolvedValue(null);

    const doc = await adapter.loadDocumentById('non-existent');

    expect(doc).toBeNull();
    expect(loadDocumentById).toHaveBeenCalledWith('non-existent');
  });

  it('should save and load a document by ID', async () => {
    const passportData = { id: 'doc-1', mrz: 'P<UTOSMITH<<JOHN' };
    loadDocumentById.mockResolvedValue(passportData);

    await adapter.saveDocument('doc-1', passportData);
    const loaded = await adapter.loadDocumentById('doc-1');

    expect(saveDocument).toHaveBeenCalledWith('doc-1', passportData);
    expect(loaded).toEqual(passportData);
  });

  it('should delete a document', async () => {
    await adapter.deleteDocument('doc-1');

    expect(deleteDocument).toHaveBeenCalledWith('doc-1');
  });
});
