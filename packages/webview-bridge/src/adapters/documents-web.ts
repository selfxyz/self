// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDocumentsAdapter } from './documents';

const DB_NAME = 'self-sdk-documents';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CATALOG_STORE = 'catalog';
const CATALOG_KEY = 'current';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        db.createObjectStore(DOCUMENTS_STORE);
      }
      if (!db.objectStoreNames.contains(CATALOG_STORE)) {
        db.createObjectStore(CATALOG_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function txPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Creates a {@link BridgeDocumentsAdapter} backed by IndexedDB.
 *
 * This is a web fallback — no native bridge required. Used when the WebView
 * handles document storage directly via the browser's IndexedDB API.
 *
 * DB: `self-sdk-documents`, version 1.
 * Object stores: `documents` (keyed by document ID), `catalog` (single `current` key).
 */
export function indexedDBDocumentsAdapter(): BridgeDocumentsAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDB();
    }
    return dbPromise;
  }

  return {
    async loadDocumentCatalog(): Promise<unknown> {
      const db = await getDB();
      const catalog = await txGet(db, CATALOG_STORE, CATALOG_KEY);
      return catalog ?? { documents: [] };
    },

    async saveDocumentCatalog(catalog: unknown): Promise<void> {
      const db = await getDB();
      await txPut(db, CATALOG_STORE, CATALOG_KEY, structuredClone(catalog));
    },

    async loadDocumentById(id: string): Promise<unknown> {
      const db = await getDB();
      const doc = await txGet(db, DOCUMENTS_STORE, id);
      return doc ?? null;
    },

    async saveDocument(id: string, data: unknown): Promise<void> {
      const db = await getDB();
      await txPut(db, DOCUMENTS_STORE, id, structuredClone(data));
    },

    async deleteDocument(id: string): Promise<void> {
      const db = await getDB();
      await txDelete(db, DOCUMENTS_STORE, id);
    },
  };
}
