// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useCallback, useEffect, useState } from 'react';

import type { DocumentData, ExternalAdapter } from '../types/ui';

export const useDocumentManager = (external: ExternalAdapter) => {
  const [documents, setDocuments] = useState<{
    [documentId: string]: DocumentData;
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    external
      .getAllDocuments()
      .then(documents => {
        setDocuments(documents);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load documents:', error);
        setIsLoading(false);
      });
  }, [external]);

  const hasRegisteredDocuments = useCallback(() => {
    return Object.values(documents).some(doc => doc.metadata.isRegistered);
  }, [documents]);

  return {
    documents,
    isLoading,
    hasRegisteredDocuments,
    setDocuments,
  };
};
