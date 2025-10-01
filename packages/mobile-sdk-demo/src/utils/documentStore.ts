// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DocumentsAdapter } from '@selfxyz/mobile-sdk-alpha';
import type { DocumentCatalog, IDDocument } from '@selfxyz/common/dist/esm/src/utils/types.js';

const CATALOG_KEY = '@self_demo:document_catalog';
const DOCUMENT_KEY_PREFIX = '@self_demo:document:';

const getDocumentKey = (id: string): string => `${DOCUMENT_KEY_PREFIX}${id}`;

const cloneCatalog = (value: DocumentCatalog): DocumentCatalog => {
  return JSON.parse(JSON.stringify(value)) as DocumentCatalog;
};

const cloneDocument = (value: IDDocument): IDDocument => {
  return JSON.parse(JSON.stringify(value)) as IDDocument;
};

export const persistentDocumentsAdapter: DocumentsAdapter = {
  async loadDocumentCatalog(): Promise<DocumentCatalog> {
    try {
      const catalogJson = await AsyncStorage.getItem(CATALOG_KEY);
      if (catalogJson) {
        return JSON.parse(catalogJson) as DocumentCatalog;
      }
      return { documents: [] };
    } catch (error) {
      console.error('Failed to load document catalog:', error);
      return { documents: [] };
    }
  },
  async saveDocumentCatalog(nextCatalog: DocumentCatalog): Promise<void> {
    try {
      await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(cloneCatalog(nextCatalog)));
    } catch (error) {
      console.error('Failed to save document catalog:', error);
      throw error;
    }
  },
  async loadDocumentById(id: string): Promise<IDDocument | null> {
    try {
      const documentJson = await AsyncStorage.getItem(getDocumentKey(id));
      if (documentJson) {
        return JSON.parse(documentJson) as IDDocument;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load document ${id}:`, error);
      return null;
    }
  },
  async saveDocument(id: string, passportData: IDDocument): Promise<void> {
    try {
      await AsyncStorage.setItem(getDocumentKey(id), JSON.stringify(cloneDocument(passportData)));
    } catch (error) {
      console.error(`Failed to save document ${id}:`, error);
      throw error;
    }
  },
  async deleteDocument(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(getDocumentKey(id));
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  },
};

export async function resetDocumentStore(): Promise<void> {
  try {
    // Load catalog to get all document IDs
    const catalog = await persistentDocumentsAdapter.loadDocumentCatalog();

    // Delete all documents
    await Promise.all(catalog.documents.map(doc => AsyncStorage.removeItem(getDocumentKey(doc.id))));

    // Clear the catalog
    await AsyncStorage.removeItem(CATALOG_KEY);
  } catch (error) {
    console.error('Failed to reset document store:', error);
    throw error;
  }
}

// Keep in-memory adapter for backwards compatibility or testing
const documentStore = new Map<string, IDDocument>();
let catalogState: DocumentCatalog = { documents: [] };

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
