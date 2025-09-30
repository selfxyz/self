// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentsAdapter } from '@selfxyz/mobile-sdk-alpha';
import type { DocumentCatalog, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';

const documentStore = new Map<string, IDDocument>();

let catalogState: DocumentCatalog = { documents: [] };

const cloneCatalog = (value: DocumentCatalog): DocumentCatalog => {
  return JSON.parse(JSON.stringify(value)) as DocumentCatalog;
};

const cloneDocument = (value: IDDocument): IDDocument => {
  return JSON.parse(JSON.stringify(value)) as IDDocument;
};

export const inMemoryDocumentsAdapter: DocumentsAdapter = {
  async loadDocumentCatalog(): Promise<DocumentCatalog> {
    return cloneCatalog(catalogState);
  },
  async saveDocumentCatalog(nextCatalog: DocumentCatalog): Promise<void> {
    catalogState = cloneCatalog(nextCatalog);
  },
  async loadDocumentById(id: string): Promise<IDDocument | null> {
    const document = documentStore.get(id);
    return document ? cloneDocument(document) : null;
  },
  async saveDocument(id: string, passportData: IDDocument): Promise<void> {
    documentStore.set(id, cloneDocument(passportData));
  },
  async deleteDocument(id: string): Promise<void> {
    documentStore.delete(id);
  },
};

export function resetDocumentStore() {
  catalogState = { documents: [] };
  documentStore.clear();
}
