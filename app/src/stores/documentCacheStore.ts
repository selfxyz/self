// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';

interface DocumentCacheState {
  catalog: DocumentCatalog | null;
  allDocuments: Record<
    string,
    { data: IDDocument; metadata: DocumentMetadata }
  > | null;
  timestamp: number | null;

  // Actions
  setCache: (
    catalog: DocumentCatalog,
    allDocuments: Record<
      string,
      { data: IDDocument; metadata: DocumentMetadata }
    >,
  ) => void;
  getCache: () => {
    catalog: DocumentCatalog;
    allDocuments: Record<
      string,
      { data: IDDocument; metadata: DocumentMetadata }
    >;
  } | null;
  clearCache: () => void;
  isValid: (maxAgeMs?: number) => boolean;
}

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Temporary cache store for document data used during the proving flow.
 * This prevents duplicate loads across ProvingScreenRouter, DocumentSelectorForProving, and ProveScreen.
 *
 * Cache is automatically invalidated after 5 minutes (configurable).
 * Cache should be cleared when:
 * - User exits the proving flow
 * - Documents are added/removed
 * - Document data is updated
 */
export const useDocumentCacheStore = create<DocumentCacheState>()(
  (set, get) => ({
    catalog: null,
    allDocuments: null,
    timestamp: null,

    setCache: (catalog, allDocuments) =>
      set({
        catalog,
        allDocuments,
        timestamp: Date.now(),
      }),

    getCache: () => {
      const state = get();
      if (!state.catalog || !state.allDocuments) {
        return null;
      }
      return {
        catalog: state.catalog,
        allDocuments: state.allDocuments,
      };
    },

    clearCache: () =>
      set({
        catalog: null,
        allDocuments: null,
        timestamp: null,
      }),

    isValid: (maxAgeMs = DEFAULT_MAX_AGE_MS) => {
      const state = get();
      if (!state.catalog || !state.allDocuments || !state.timestamp) {
        return false;
      }
      const age = Date.now() - state.timestamp;
      return age < maxAgeMs;
    },
  }),
);
