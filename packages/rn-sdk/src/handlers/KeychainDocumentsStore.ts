// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentsStore } from './DocumentsHandler';
import type { KeychainModule } from './KeychainHandler';
import { loadKeychainModule } from './KeychainHandler';

// Service names are a persistence contract — renaming loses user documents.
// Deliberately outside KeychainHandler's `self_sdk_${key}` namespace (any
// prefix under it is collidable with a webview-chosen secureStorage key) and
// disjoint from the Self app's own `documentCatalog`/`document-<hash>`
// services. The catalog service is not derivable from any document id.
const CATALOG_SERVICE = 'self_docs_catalog';
const DOC_SERVICE_PREFIX = 'self_docs_doc_';

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Keychain-backed DocumentsStore for hosts that don't inject their own
 * (`SelfVerification`'s `documents` prop). Values are stored as JSON strings
 * in generic-password entries, one service per document plus one for the
 * catalog. Returns null when react-native-keychain is not installed so the
 * caller can fall back explicitly.
 */
export function createKeychainDocumentsStore(keychain?: KeychainModule): DocumentsStore | null {
  const module = keychain ?? loadKeychainModule();
  if (!module) {
    return null;
  }

  async function read(service: string): Promise<unknown> {
    const credentials = await module!.getGenericPassword({ service });
    return credentials ? safeParse(credentials.password) : null;
  }

  async function write(service: string, username: string, value: unknown): Promise<void> {
    await module!.setGenericPassword(username, JSON.stringify(value ?? null), { service });
  }

  return {
    loadCatalog: () => read(CATALOG_SERVICE),
    saveCatalog: catalog => write(CATALOG_SERVICE, 'catalog', catalog),
    loadById: id => read(`${DOC_SERVICE_PREFIX}${id}`),
    save: (id, data) => write(`${DOC_SERVICE_PREFIX}${id}`, id, data),
    async delete(id) {
      await module!.resetGenericPassword({ service: `${DOC_SERVICE_PREFIX}${id}` });
    },
  };
}
