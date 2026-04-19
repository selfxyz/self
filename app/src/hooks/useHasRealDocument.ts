// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { usePassport } from '@/providers/passportDataProvider';

/**
 * Returns whether the user has at least one real (non-mock) document in their
 * catalog. `null` means the catalog has not loaded yet — callers gating UI
 * should treat `null` as "unknown" and typically hide the gated affordance
 * until the value resolves. Refreshes on screen focus.
 */
const useHasRealDocument = (
  logScope?: string,
): { hasRealDocument: boolean | null; refresh: () => Promise<void> } => {
  const { loadDocumentCatalog } = usePassport();
  const [hasRealDocument, setHasRealDocument] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const catalog = await loadDocumentCatalog();
      if (!catalog?.documents || !Array.isArray(catalog.documents)) {
        if (logScope) {
          console.warn(`${logScope}: invalid catalog structure`);
        }
        setHasRealDocument(false);
        return;
      }
      setHasRealDocument(catalog.documents.some(doc => !doc.mock));
    } catch {
      if (logScope) {
        console.warn(`${logScope}: failed to load document catalog`);
      }
      setHasRealDocument(false);
    }
  }, [loadDocumentCatalog, logScope]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { hasRealDocument, refresh };
};

export default useHasRealDocument;
