// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act } from '@testing-library/react-native';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';

import { useDocumentCacheStore } from '@/stores/documentCacheStore';

describe('documentCacheStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useDocumentCacheStore.setState({
        catalog: null,
        allDocuments: null,
        timestamp: null,
      });
    });
  });

  describe('setCache and getCache', () => {
    it('sets and retrieves cached data', () => {
      const catalog: DocumentCatalog = {
        documents: [
          {
            id: 'doc-1',
            documentType: 'us',
            documentCategory: 'passport',
            data: 'mock-data',
            mock: false,
          } as DocumentMetadata,
        ],
        selectedDocumentId: 'doc-1',
      };

      const allDocuments: Record<
        string,
        { data: IDDocument; metadata: DocumentMetadata }
      > = {
        'doc-1': {
          data: {
            documentType: 'us',
            documentCategory: 'passport',
            mock: false,
          } as any,
          metadata: catalog.documents[0],
        },
      };

      act(() => {
        useDocumentCacheStore.getState().setCache(catalog, allDocuments);
      });

      const cached = useDocumentCacheStore.getState().getCache();

      expect(cached).toEqual({ catalog, allDocuments });
      expect(useDocumentCacheStore.getState().timestamp).toBeTruthy();
    });

    it('returns null when cache is empty', () => {
      const cached = useDocumentCacheStore.getState().getCache();
      expect(cached).toBeNull();
    });

    it('returns null when catalog is missing', () => {
      act(() => {
        useDocumentCacheStore.setState({
          catalog: null,
          allDocuments: {} as any,
          timestamp: Date.now(),
        });
      });

      const cached = useDocumentCacheStore.getState().getCache();
      expect(cached).toBeNull();
    });

    it('returns null when allDocuments is missing', () => {
      act(() => {
        useDocumentCacheStore.setState({
          catalog: { documents: [] } as any,
          allDocuments: null,
          timestamp: Date.now(),
        });
      });

      const cached = useDocumentCacheStore.getState().getCache();
      expect(cached).toBeNull();
    });
  });

  describe('isValid', () => {
    it('returns false when cache is empty', () => {
      const isValid = useDocumentCacheStore.getState().isValid();
      expect(isValid).toBe(false);
    });

    it('returns true when cache is fresh', () => {
      const catalog: DocumentCatalog = {
        documents: [],
      };
      const allDocuments = {};

      act(() => {
        useDocumentCacheStore.getState().setCache(catalog, allDocuments);
      });

      const isValid = useDocumentCacheStore.getState().isValid();
      expect(isValid).toBe(true);
    });

    it('returns false when cache is expired (default 5 minutes)', () => {
      const catalog: DocumentCatalog = {
        documents: [],
      };
      const allDocuments = {};

      // Set cache with expired timestamp
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 - 1000; // 5 minutes + 1 second

      act(() => {
        useDocumentCacheStore.setState({
          catalog,
          allDocuments,
          timestamp: fiveMinutesAgo,
        });
      });

      const isValid = useDocumentCacheStore.getState().isValid();
      expect(isValid).toBe(false);
    });

    it('respects custom maxAge parameter', () => {
      const catalog: DocumentCatalog = {
        documents: [],
      };
      const allDocuments = {};

      // Set cache with timestamp 30 seconds ago
      const thirtySecondsAgo = Date.now() - 30 * 1000;

      act(() => {
        useDocumentCacheStore.setState({
          catalog,
          allDocuments,
          timestamp: thirtySecondsAgo,
        });
      });

      // Should be valid with 1 minute maxAge
      expect(useDocumentCacheStore.getState().isValid(60 * 1000)).toBe(true);

      // Should be invalid with 10 second maxAge
      expect(useDocumentCacheStore.getState().isValid(10 * 1000)).toBe(false);
    });

    it('returns false when timestamp is missing', () => {
      act(() => {
        useDocumentCacheStore.setState({
          catalog: { documents: [] } as any,
          allDocuments: {},
          timestamp: null,
        });
      });

      const isValid = useDocumentCacheStore.getState().isValid();
      expect(isValid).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('clears all cached data', () => {
      const catalog: DocumentCatalog = {
        documents: [],
      };
      const allDocuments = {};

      act(() => {
        useDocumentCacheStore.getState().setCache(catalog, allDocuments);
      });

      // Verify cache is set
      expect(useDocumentCacheStore.getState().getCache()).not.toBeNull();

      act(() => {
        useDocumentCacheStore.getState().clearCache();
      });

      // Verify cache is cleared
      expect(useDocumentCacheStore.getState().catalog).toBeNull();
      expect(useDocumentCacheStore.getState().allDocuments).toBeNull();
      expect(useDocumentCacheStore.getState().timestamp).toBeNull();
      expect(useDocumentCacheStore.getState().getCache()).toBeNull();
    });

    it('can clear already empty cache', () => {
      act(() => {
        useDocumentCacheStore.getState().clearCache();
      });

      expect(useDocumentCacheStore.getState().getCache()).toBeNull();
    });
  });

  describe('cache invalidation scenarios', () => {
    it('correctly identifies barely valid cache (just under maxAge)', () => {
      const catalog: DocumentCatalog = {
        documents: [],
      };
      const allDocuments = {};

      // Set cache with timestamp just under 5 minutes ago
      const justUnderFiveMinutes = Date.now() - (5 * 60 * 1000 - 1000); // 4 minutes 59 seconds

      act(() => {
        useDocumentCacheStore.setState({
          catalog,
          allDocuments,
          timestamp: justUnderFiveMinutes,
        });
      });

      const isValid = useDocumentCacheStore.getState().isValid();
      expect(isValid).toBe(true);
    });

    it('correctly identifies barely invalid cache (just over maxAge)', () => {
      const catalog: DocumentCatalog = {
        documents: [],
      };
      const allDocuments = {};

      // Set cache with timestamp just over 5 minutes ago
      const justOverFiveMinutes = Date.now() - (5 * 60 * 1000 + 1000); // 5 minutes 1 second

      act(() => {
        useDocumentCacheStore.setState({
          catalog,
          allDocuments,
          timestamp: justOverFiveMinutes,
        });
      });

      const isValid = useDocumentCacheStore.getState().isValid();
      expect(isValid).toBe(false);
    });
  });
});
