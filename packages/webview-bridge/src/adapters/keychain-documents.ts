// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCatalog, DocumentsAdapter, IDDocument } from '@selfxyz/mobile-sdk-alpha/browser';

import type { WebViewBridge } from '../bridge';

const CATALOG_KEY = 'self_document_catalog';
const DOC_PREFIX = 'self_doc_';
const EMPTY_CATALOG: DocumentCatalog = { documents: [] };

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function createKeychainDocumentsAdapter(bridge: WebViewBridge): DocumentsAdapter {
  async function storageGet(key: string): Promise<string | null> {
    const result = await bridge.request<{ value: string | null }>('secureStorage', 'get', { key });
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
      return raw ? safeParse(raw, EMPTY_CATALOG) : EMPTY_CATALOG;
    },
    async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
      await storageSet(CATALOG_KEY, JSON.stringify(catalog));
    },
    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const raw = await storageGet(`${DOC_PREFIX}${id}`);
      return raw ? safeParse<IDDocument | null>(raw, null) : null;
    },
    async saveDocument(id: string, doc: IDDocument): Promise<void> {
      await storageSet(`${DOC_PREFIX}${id}`, JSON.stringify(doc));
    },
    async deleteDocument(id: string): Promise<void> {
      await storageRemove(`${DOC_PREFIX}${id}`);
    },
  };
}
