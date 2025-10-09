// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useState } from 'react';

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common/utils/types';
import { getAllDocuments, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { updateAfterDelete } from '../lib/catalog';

export type DocumentEntry = {
  metadata: DocumentMetadata;
  data: IDDocument;
};

export function useDocuments() {
  const selfClient = useSelfClient();
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllDocuments(selfClient);
      const sortedDocuments = Object.values(all).sort((a, b) => {
        // Registered documents first
        if (a.metadata.isRegistered && !b.metadata.isRegistered) {
          return -1;
        }
        if (!a.metadata.isRegistered && b.metadata.isRegistered) {
          return 1;
        }
        return 0;
      });
      setDocuments(sortedDocuments);
    } catch (err) {
      setDocuments([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selfClient]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteDocument = useCallback(
    async (documentId: string) => {
      setDeleting(documentId);
      try {
        await selfClient.deleteDocument(documentId);
        const currentCatalog = await selfClient.loadDocumentCatalog();
        const updatedCatalog = updateAfterDelete(currentCatalog, documentId);
        await selfClient.saveDocumentCatalog(updatedCatalog);
        await refresh();
      } finally {
        setDeleting(null);
      }
    },
    [selfClient, refresh],
  );

  const clearAllDocuments = useCallback(async () => {
    setClearing(true);
    setError(null);
    let originalCatalog: DocumentCatalog | null = null;
    try {
      // Read and persist the existing catalog.
      originalCatalog = await selfClient.loadDocumentCatalog();
      const docIds = originalCatalog.documents.map(d => d.id);

      // Write an empty catalog to atomically remove references.
      const emptyCatalog = {
        documents: [],
        selectedDocumentId: undefined,
      };
      await selfClient.saveDocumentCatalog(emptyCatalog);

      try {
        // Then perform deletions of document ids from storage.
        for (const docId of docIds) {
          await selfClient.deleteDocument(docId);
        }
      } catch (deletionError) {
        // If any deletion fails, restore the previous catalog and re-throw.
        if (originalCatalog) {
          await selfClient.saveDocumentCatalog(originalCatalog);
        }
        throw deletionError; // Re-throw to be caught by the outer catch block.
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setClearing(false);
    }
  }, [selfClient, refresh]);

  return { documents, loading, error, deleting, clearing, refresh, deleteDocument, clearAllDocuments } as const;
}
