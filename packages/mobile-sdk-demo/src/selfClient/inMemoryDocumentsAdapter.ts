import {
  calculateContentHash,
  inferDocumentCategory,
  isMRZDocument,
  type DocumentCatalog,
  type DocumentMetadata,
  type IDDocument,
} from '@selfxyz/common';
import type { DocumentsAdapter } from '@selfxyz/mobile-sdk-alpha';

function cloneCatalog(catalog: DocumentCatalog): DocumentCatalog {
  return {
    documents: catalog.documents.map(doc => ({ ...doc })),
    ...(catalog.selectedDocumentId ? { selectedDocumentId: catalog.selectedDocumentId } : {}),
  };
}

export class InMemoryDocumentsAdapter implements DocumentsAdapter {
  private readonly documents = new Map<string, IDDocument>();
  private catalog: DocumentCatalog = { documents: [] };

  async loadDocumentCatalog(): Promise<DocumentCatalog> {
    return cloneCatalog(this.catalog);
  }

  async saveDocumentCatalog(catalog: DocumentCatalog): Promise<void> {
    const unique = new Map<string, DocumentMetadata>();
    for (const metadata of catalog.documents) {
      unique.set(metadata.id, { ...metadata });
    }

    this.catalog = {
      documents: Array.from(unique.values()),
      ...(catalog.selectedDocumentId ? { selectedDocumentId: catalog.selectedDocumentId } : {}),
    };
  }

  async loadDocumentById(id: string): Promise<IDDocument | null> {
    return this.documents.get(id) ?? null;
  }

  async saveDocument(_id: string, passportData: IDDocument): Promise<void> {
    const contentHash = calculateContentHash(passportData);

    this.documents.set(contentHash, passportData);

    const metadata: DocumentMetadata = {
      id: contentHash,
      documentType: passportData.documentType,
      documentCategory: passportData.documentCategory ?? inferDocumentCategory(passportData.documentType),
      data: isMRZDocument(passportData) ? passportData.mrz : 'qrData' in passportData ? passportData.qrData ?? '' : '',
      mock: Boolean(passportData.mock),
      isRegistered: this.catalog.documents.find(doc => doc.id === contentHash)?.isRegistered ?? false,
    };

    const existingIndex = this.catalog.documents.findIndex(doc => doc.id === contentHash);
    if (existingIndex >= 0) {
      this.catalog.documents.splice(existingIndex, 1, metadata);
    } else {
      this.catalog.documents.push(metadata);
    }

    if (!this.catalog.selectedDocumentId) {
      this.catalog.selectedDocumentId = contentHash;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    const nextDocuments = this.catalog.documents.filter(doc => doc.id !== id);
    const nextCatalog: DocumentCatalog = { documents: nextDocuments };

    if (this.catalog.selectedDocumentId === id) {
      nextCatalog.selectedDocumentId = nextDocuments[0]?.id;
    } else if (this.catalog.selectedDocumentId) {
      nextCatalog.selectedDocumentId = this.catalog.selectedDocumentId;
    }

    this.catalog = nextCatalog;
  }
}

export function createInMemoryDocumentsAdapter(): InMemoryDocumentsAdapter {
  return new InMemoryDocumentsAdapter();
}
