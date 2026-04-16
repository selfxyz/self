// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCatalog, IDDocument } from '@selfxyz/common';

import type { DocumentsAdapter } from '../../types/public';

const DB_NAME = 'self-sdk-documents';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CATALOG_STORE = 'catalog';
const CATALOG_KEY = 'current';

export function cloneForStorage<T>(value: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch {
      // Fall through to the JSON clone for WebViews with partial implementations.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

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
 * Creates a {@link DocumentsAdapter} backed by IndexedDB.
 *
 * DB: `self-sdk-documents`, version 1.
 * Object stores: `documents` (keyed by document ID), `catalog` (single `current` key).
 */
export function createIndexedDBDocumentsAdapter(): DocumentsAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDB();
    }
    return dbPromise;
  }

  return {
    async loadDocumentCatalog(): Promise<DocumentCatalog> {
      const db = await getDB();
      const catalog = await txGet<DocumentCatalog>(db, CATALOG_STORE, CATALOG_KEY);
      return catalog ?? { documents: [] };
    },

    async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
      const db = await getDB();
      await txPut(db, CATALOG_STORE, CATALOG_KEY, cloneForStorage(catalog));
    },

    async loadDocumentById(id: string): Promise<IDDocument | null> {
      const db = await getDB();
      const doc = await txGet<IDDocument>(db, DOCUMENTS_STORE, id);
      return doc ?? null;
    },

    async saveDocument(id: string, passportData: IDDocument): Promise<void> {
      const db = await getDB();
      await txPut(db, DOCUMENTS_STORE, id, cloneForStorage(passportData));
    },

    async deleteDocument(id: string): Promise<void> {
      const db = await getDB();
      await txDelete(db, DOCUMENTS_STORE, id);
    },
  };
}
