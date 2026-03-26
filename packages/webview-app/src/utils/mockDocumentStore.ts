// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

interface MockDocument {
  id: string;
  documentType: string;
  documentCategory: string;
  data: string;
  mock: boolean;
  isRegistered: boolean;
}

interface MockDocumentCatalog {
  documents: MockDocument[];
  selectedDocumentId?: string;
}

type Listener = () => void;

const STORAGE_KEY = 'self_mock_documents';

function loadFromStorage(): MockDocument[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(docs: MockDocument[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // noop
  }
}

let documents: MockDocument[] = loadFromStorage();
let snapshot: MockDocumentCatalog = buildSnapshot(documents);
const listeners = new Set<Listener>();

function buildSnapshot(docs: MockDocument[]): MockDocumentCatalog {
  return { documents: docs, selectedDocumentId: docs[0]?.id };
}

function notify(): void {
  snapshot = buildSnapshot(documents);
  for (const fn of listeners) fn();
}

const docTypeToCategory = (documentType: string): string => {
  switch (documentType) {
    case 'p':
      return 'passport';
    case 'i':
      return 'id_card';
    case 'a':
      return 'aadhaar';
    default:
      return 'passport';
  }
};

export const mockDocumentStore = {
  getCatalog(): MockDocumentCatalog {
    return snapshot;
  },

  addDocument(countryCode: string, documentType: string): MockDocument {
    const doc: MockDocument = {
      id: `mock-${Date.now()}`,
      documentType,
      documentCategory: docTypeToCategory(documentType),
      data: JSON.stringify({ countryCode, documentType, mock: true }),
      mock: true,
      isRegistered: true,
    };
    documents = [...documents, doc];
    saveToStorage(documents);
    notify();
    return doc;
  },

  clear(): void {
    documents = [];
    saveToStorage(documents);
    notify();
  },

  hasDocuments(): boolean {
    return documents.length > 0;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
