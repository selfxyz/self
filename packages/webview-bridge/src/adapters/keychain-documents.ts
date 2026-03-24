// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';
import type { DocumentsAdapter, DocumentCatalog, IDDocument } from '@selfxyz/mobile-sdk-alpha/browser';

const CATALOG_KEY = 'self_document_catalog';
const DOC_PREFIX = 'self_doc_';

export function createKeychainDocumentsAdapter(bridge: WebViewBridge): DocumentsAdapter {
  async function storageGet(key: string): Promise<string | null> {
    const result = await bridge.request<{ value: string | null }>(
      'secureStorage', 'get', { key },
    );
    return result?.value ?? null;
  }

  async function storageSet(key: string, value: string): Promise<void> {
    await bridge.request('secureStorage', 'set', { key, value });
  }

  async function storageRemove(key: string): Promise<void> {
    await bridge.request('secureStorage', 'remove', { key });
  }

  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      const raw = await storageGet(CATALOG_KEY);
      return raw ? JSON.parse(raw) : { documents: [] };
    },
    async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
      await storageSet(CATALOG_KEY, JSON.stringify(catalog));
    },
    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const raw = await storageGet(`${DOC_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : null;
    },
    async saveDocument(id: string, doc: IDDocument): Promise<void> {
      await storageSet(`${DOC_PREFIX}${id}`, JSON.stringify(doc));
    },
    async deleteDocument(id: string): Promise<void> {
      await storageRemove(`${DOC_PREFIX}${id}`);
    },
  };
}
