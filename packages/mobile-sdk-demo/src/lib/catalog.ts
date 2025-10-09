// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCatalog } from '@selfxyz/common/utils/types';

export function updateAfterDelete(catalog: DocumentCatalog, deletedId: string): DocumentCatalog {
  const remaining = (catalog.documents || []).filter(doc => doc.id !== deletedId);

  const nextSelected =
    catalog.selectedDocumentId === deletedId
      ? remaining.length > 0
        ? remaining[0].id
        : undefined
      : catalog.selectedDocumentId;

  return {
    ...catalog,
    documents: remaining,
    selectedDocumentId: nextSelected,
  } as DocumentCatalog;
}

export function selectDocument(catalog: DocumentCatalog, id: string): DocumentCatalog {
  const exists = (catalog.documents || []).some(d => d.id === id);
  if (!exists) return catalog;
  return {
    ...catalog,
    selectedDocumentId: id,
  } as DocumentCatalog;
}
