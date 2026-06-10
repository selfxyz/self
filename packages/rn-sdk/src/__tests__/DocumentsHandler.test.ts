// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentsHandler, type DocumentsStore } from '../handlers/DocumentsHandler';

describe('DocumentsHandler', () => {
  let store: DocumentsStore;
  let handler: DocumentsHandler;

  beforeEach(() => {
    store = {
      loadCatalog: vi.fn().mockResolvedValue({ docs: [] }),
      saveCatalog: vi.fn().mockResolvedValue(undefined),
      loadById: vi.fn().mockResolvedValue({ id: 'doc-1' }),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    handler = new DocumentsHandler(store);
  });

  it('has domain "documents"', () => {
    expect(handler.domain).toBe('documents');
  });

  it('returns the catalog from the store', async () => {
    const result = await handler.handle('loadCatalog', {});
    expect(result).toEqual({ docs: [] });
    expect(store.loadCatalog).toHaveBeenCalled();
  });

  it('persists the catalog through the store', async () => {
    await handler.handle('saveCatalog', { catalog: { docs: ['a'] } });
    expect(store.saveCatalog).toHaveBeenCalledWith({ docs: ['a'] });
  });

  it('loads a document by id', async () => {
    const result = await handler.handle('loadById', { id: 'doc-1' });
    expect(result).toEqual({ id: 'doc-1' });
    expect(store.loadById).toHaveBeenCalledWith('doc-1');
  });

  it('throws MISSING_ID when id is absent on loadById', async () => {
    await expect(handler.handle('loadById', {})).rejects.toMatchObject({
      code: 'MISSING_ID',
    });
  });

  it('saves a document by id', async () => {
    await handler.handle('save', { id: 'doc-1', data: { foo: 'bar' } });
    expect(store.save).toHaveBeenCalledWith('doc-1', { foo: 'bar' });
  });

  it('deletes a document by id', async () => {
    await handler.handle('delete', { id: 'doc-1' });
    expect(store.delete).toHaveBeenCalledWith('doc-1');
  });

  it('throws METHOD_NOT_FOUND for unknown method', async () => {
    await expect(handler.handle('archive', {})).rejects.toMatchObject({
      code: 'METHOD_NOT_FOUND',
    });
  });

  it('falls back to an in-memory store when none is injected', async () => {
    const fallback = new DocumentsHandler();
    await fallback.handle('save', { id: 'x', data: { v: 1 } });
    const loaded = await fallback.handle('loadById', { id: 'x' });
    expect(loaded).toEqual({ v: 1 });
    await fallback.handle('delete', { id: 'x' });
    const afterDelete = await fallback.handle('loadById', { id: 'x' });
    expect(afterDelete).toBeNull();
  });
});
