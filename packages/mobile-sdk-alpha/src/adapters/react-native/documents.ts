// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCatalog, IDDocument, PassportData } from '@selfxyz/common';
import { getSKIPEM, initPassportDataParsing } from '@selfxyz/common';

import type { DocumentsAdapter } from '../../types/public';

const DEFAULT_CATALOG_KEY = '@self:document_catalog';
const DEFAULT_DOCUMENT_KEY_PREFIX = '@self:document:';

const cloneCatalog = (value: DocumentCatalog): DocumentCatalog => {
  return JSON.parse(JSON.stringify(value)) as DocumentCatalog;
};

const cloneDocument = (value: IDDocument): IDDocument => {
  return JSON.parse(JSON.stringify(value)) as IDDocument;
};

async function reparseIfNeeded(doc: IDDocument): Promise<IDDocument> {
  if (doc.documentCategory === 'passport' || doc.documentCategory === 'id_card') {
    const passportDoc = doc as PassportData;
    if (!passportDoc.dsc_parsed || !passportDoc.passportMetadata) {
      const env = passportDoc.mock ? 'staging' : 'production';
      const skiPem = await getSKIPEM(env);
      return initPassportDataParsing(passportDoc, skiPem);
    }
  }
  return doc;
}

/**
 * Creates an AsyncStorage-backed {@link DocumentsAdapter}.
 *
 * Requires `@react-native-async-storage/async-storage` to be installed as a
 * peer dependency.
 *
 * @param opts.keyPrefix - Storage key prefix (default `@self:`).
 */
export function createDocumentsAdapter(opts?: { keyPrefix?: string }): DocumentsAdapter {
  // Dynamic import so the module is only resolved when the adapter is actually
  // instantiated. This keeps the bundle free of AsyncStorage when consumers
  // provide their own DocumentsAdapter.
  let _AsyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;

  async function getAsyncStorage() {
    if (_AsyncStorage) return _AsyncStorage;
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      _AsyncStorage = mod.default;
      return _AsyncStorage;
    } catch {
      throw new Error(
        'createDocumentsAdapter requires @react-native-async-storage/async-storage. ' +
          'Install it as a dependency of your app.',
      );
    }
  }

  const prefix = opts?.keyPrefix ?? DEFAULT_DOCUMENT_KEY_PREFIX;
  const catalogKey = opts?.keyPrefix ? `${opts.keyPrefix}document_catalog` : DEFAULT_CATALOG_KEY;

  const getDocumentKey = (id: string): string => `${prefix}${id}`;

  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      try {
        const AsyncStorage = await getAsyncStorage();
        const catalogJson = await AsyncStorage.getItem(catalogKey);
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
        const AsyncStorage = await getAsyncStorage();
        await AsyncStorage.setItem(catalogKey, JSON.stringify(cloneCatalog(nextCatalog)));
      } catch (error) {
        console.error('Failed to save document catalog:', error);
        throw error;
      }
    },

    async loadDocumentById(id: string): Promise<IDDocument | null> {
      try {
        const AsyncStorage = await getAsyncStorage();
        const documentJson = await AsyncStorage.getItem(getDocumentKey(id));
        if (documentJson) {
          const doc = JSON.parse(documentJson) as IDDocument;
          return reparseIfNeeded(doc);
        }
        return null;
      } catch (error) {
        console.error(`Failed to load document ${id}:`, error);
        return null;
      }
    },

    async saveDocument(id: string, passportData: IDDocument): Promise<void> {
      try {
        const AsyncStorage = await getAsyncStorage();
        await AsyncStorage.setItem(getDocumentKey(id), JSON.stringify(cloneDocument(passportData)));
      } catch (error) {
        console.error(`Failed to save document ${id}:`, error);
        throw error;
      }
    },

    async deleteDocument(id: string): Promise<void> {
      try {
        const AsyncStorage = await getAsyncStorage();
        await AsyncStorage.removeItem(getDocumentKey(id));
      } catch (error) {
        console.error(`Failed to delete document ${id}:`, error);
        throw error;
      }
    },
  };
}

/**
 * In-memory {@link DocumentsAdapter} for testing or non-persistent use cases.
 */
export function createInMemoryDocumentsAdapter(): DocumentsAdapter {
  const documentStore = new Map<string, IDDocument>();
  let catalogState: DocumentCatalog = { documents: [] };

  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      return cloneCatalog(catalogState);
    },
    async saveDocumentCatalog(nextCatalog: DocumentCatalog): Promise<void> {
      catalogState = cloneCatalog(nextCatalog);
    },
    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const document = documentStore.get(id);
      if (!document) return null;
      const doc = cloneDocument(document);
      return reparseIfNeeded(doc);
    },
    async saveDocument(id: string, passportData: IDDocument): Promise<void> {
      documentStore.set(id, cloneDocument(passportData));
    },
    async deleteDocument(id: string): Promise<void> {
      documentStore.delete(id);
    },
  };
}
