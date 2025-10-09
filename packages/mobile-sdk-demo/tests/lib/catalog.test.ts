// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import type { DocumentCatalog } from '@selfxyz/common/utils/types';

import { selectDocument, updateAfterDelete } from '../../src/lib/catalog';

const makeCatalog = (ids: string[], selected?: string): DocumentCatalog => ({
  documents: ids.map(id => ({
    id,
    documentType: 'mock_passport',
    documentCategory: 'passport',
    data: 'LINE1\nLINE2',
    mock: true,
    isRegistered: false,
  })),
  selectedDocumentId: selected,
});

describe('catalog lib', () => {
  describe('updateAfterDelete', () => {
    it('removes the document and keeps selection if different', () => {
      const catalog = makeCatalog(['a', 'b', 'c'], 'b');
      const result = updateAfterDelete(catalog, 'a');
      expect(result.documents.map(d => d.id)).toEqual(['b', 'c']);
      expect(result.selectedDocumentId).toBe('b');
    });

    it('removes the document and selects first remaining if the deleted was selected', () => {
      const catalog = makeCatalog(['a', 'b', 'c'], 'a');
      const result = updateAfterDelete(catalog, 'a');
      expect(result.documents.map(d => d.id)).toEqual(['b', 'c']);
      expect(result.selectedDocumentId).toBe('b');
    });

    it('clears selection if no documents remain', () => {
      const catalog = makeCatalog(['only'], 'only');
      const result = updateAfterDelete(catalog, 'only');
      expect(result.documents).toEqual([]);
      expect(result.selectedDocumentId).toBeUndefined();
    });
  });

  describe('selectDocument', () => {
    it('sets selection when id exists', () => {
      const catalog = makeCatalog(['a', 'b', 'c'], 'a');
      const result = selectDocument(catalog, 'c');
      expect(result.selectedDocumentId).toBe('c');
    });

    it('keeps selection when id does not exist', () => {
      const catalog = makeCatalog(['a', 'b', 'c'], 'a');
      const result = selectDocument(catalog, 'z');
      expect(result.selectedDocumentId).toBe('a');
    });
  });
});
