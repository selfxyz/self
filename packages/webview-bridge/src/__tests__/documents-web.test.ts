// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { indexedDBDocumentsAdapter } from '../adapters/documents-web';
import type { BridgeDocumentsAdapter } from '../adapters/documents';

describe('indexedDBDocumentsAdapter', () => {
  let adapter: BridgeDocumentsAdapter;

  beforeEach(() => {
    adapter = indexedDBDocumentsAdapter();
  });

  it('should return empty catalog when none exists', async () => {
    const catalog = await adapter.loadDocumentCatalog();
    expect(catalog).toEqual({ documents: [] });
  });

  it('should save and load a document catalog', async () => {
    const catalog = { documents: [{ id: 'doc-1', type: 'passport' }] };
    await adapter.saveDocumentCatalog(catalog);

    const loaded = await adapter.loadDocumentCatalog();
    expect(loaded).toEqual(catalog);
  });

  it('should not mutate the original catalog on save', async () => {
    const catalog = { documents: [{ id: 'doc-1' }] };
    await adapter.saveDocumentCatalog(catalog);

    // Mutate original
    catalog.documents.push({ id: 'doc-2' });

    const loaded = (await adapter.loadDocumentCatalog()) as { documents: { id: string }[] };
    expect(loaded.documents).toHaveLength(1);
  });

  it('should return null for non-existent document', async () => {
    const doc = await adapter.loadDocumentById('non-existent');
    expect(doc).toBeNull();
  });

  it('should save and load a document by ID', async () => {
    const passportData = { id: 'doc-1', mrz: 'P<UTOSMITH<<JOHN' };
    await adapter.saveDocument('doc-1', passportData);

    const loaded = await adapter.loadDocumentById('doc-1');
    expect(loaded).toEqual(passportData);
  });

  it('should delete a document', async () => {
    await adapter.saveDocument('doc-1', { id: 'doc-1' });
    await adapter.deleteDocument('doc-1');

    const loaded = await adapter.loadDocumentById('doc-1');
    expect(loaded).toBeNull();
  });

  it('should handle deleting a non-existent document (idempotent)', async () => {
    await adapter.deleteDocument('non-existent');
  });
});
