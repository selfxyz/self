// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
