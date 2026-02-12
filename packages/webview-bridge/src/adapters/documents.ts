/**
 * Bridge documents adapter.
 *
 * All document CRUD operations go through the bridge to native encrypted
 * storage. The native side handles encryption at rest.
 */

import type { WebViewBridge } from '../bridge';

/** Mirrors DocumentCatalog from @selfxyz/common */
export interface DocumentCatalog {
  [key: string]: unknown;
}

/** Mirrors IDDocument from @selfxyz/common */
export interface IDDocument {
  [key: string]: unknown;
}

/** Mirrors DocumentsAdapter from mobile-sdk-alpha */
export interface DocumentsAdapter {
  loadDocumentCatalog(): Promise<DocumentCatalog>;
  saveDocumentCatalog(catalog: DocumentCatalog): Promise<void>;
  loadDocumentById(id: string): Promise<IDDocument | null>;
  saveDocument(id: string, passportData: IDDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}

/**
 * Creates a documents adapter that routes all CRUD through the bridge
 * to native encrypted storage.
 */
export function bridgeDocumentsAdapter(bridge: WebViewBridge): DocumentsAdapter {
  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      const result = await bridge.request<DocumentCatalog>(
        'documents',
        'loadCatalog',
      );
      return result;
    },

    async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
      await bridge.request(
        'documents',
        'saveCatalog',
        { catalog },
      );
    },

    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const result = await bridge.request<IDDocument | null>(
        'documents',
        'loadById',
        { id },
      );
      return result;
    },

    async saveDocument(id: string, passportData: IDDocument): Promise<void> {
      await bridge.request(
        'documents',
        'save',
        { id, data: passportData },
      );
    },

    async deleteDocument(id: string): Promise<void> {
      await bridge.request(
        'documents',
        'delete',
        { id },
      );
    },
  };
}
