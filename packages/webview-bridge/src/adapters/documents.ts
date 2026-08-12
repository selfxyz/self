// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCatalog, DocumentsAdapter, IDDocument } from '@selfxyz/mobile-sdk-alpha/browser';

import type { WebViewBridge } from '../bridge';

export interface BridgeDocumentsAdapter {
  loadDocumentCatalog(): Promise<unknown>;
  saveDocumentCatalog(catalog: unknown): Promise<void>;
  loadDocumentById(id: string): Promise<unknown>;
  saveDocument(id: string, data: unknown): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}

export function bridgeDocumentsAdapter(bridge: WebViewBridge): BridgeDocumentsAdapter {
  return {
    loadDocumentCatalog(): Promise<unknown> {
      return bridge.request('documents', 'loadCatalog');
    },

    async saveDocumentCatalog(catalog: unknown): Promise<void> {
      await bridge.request('documents', 'saveCatalog', { catalog });
    },

    loadDocumentById(id: string): Promise<unknown> {
      return bridge.request('documents', 'loadById', { id });
    },

    async saveDocument(id: string, data: unknown): Promise<void> {
      await bridge.request('documents', 'save', { id, data });
    },

    async deleteDocument(id: string): Promise<void> {
      await bridge.request('documents', 'delete', { id });
    },
  };
}

const EMPTY_CATALOG: DocumentCatalog = { documents: [] };

// The documents host store legitimately returns null for a never-written
// catalog (DocumentsHandler contract), but SDK callers dereference
// catalog.documents unguarded — normalize anything malformed to an empty
// catalog at the boundary.
function normalizeCatalog(raw: unknown): DocumentCatalog {
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { documents?: unknown }).documents)
  ) {
    return raw as DocumentCatalog;
  }
  return EMPTY_CATALOG;
}

/**
 * SDK-facing typed adapter over the raw `documents` bridge domain. This is
 * what webview-app hands to createSelfClient; the host side is rn-sdk's
 * DocumentsHandler (or the host's injected store, e.g. the Self app's
 * keychain-backed document store in webview-in-app).
 */
export function createBridgeDocumentsSdkAdapter(bridge: WebViewBridge): DocumentsAdapter {
  const raw = bridgeDocumentsAdapter(bridge);
  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      return normalizeCatalog(await raw.loadDocumentCatalog());
    },
    async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
      await raw.saveDocumentCatalog(catalog);
    },
    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const doc = await raw.loadDocumentById(id);
      return doc && typeof doc === 'object' ? (doc as IDDocument) : null;
    },
    async saveDocument(id: string, doc: IDDocument): Promise<void> {
      await raw.saveDocument(id, doc);
    },
    async deleteDocument(id: string): Promise<void> {
      await raw.deleteDocument(id);
    },
  };
}
