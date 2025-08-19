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
