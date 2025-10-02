// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useState } from 'react';

import type { DocumentMetadata, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllDocuments(selfClient);
      setDocuments(Object.values(all));
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

  return { documents, loading, error, deleting, refresh, deleteDocument } as const;
}
