// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { DocumentMetadata, PassportData } from '@selfxyz/common/utils/types';

import { SelfClient } from '../types/public';

/**
 * Gets all documents from the document catalog.
 *
 * @param selfClient - The SelfClient instance to use for loading the document catalog.
 * @returns A dictionary of document IDs to their data and metadata.
 */
export const getAllDocuments = async (
  selfClient: SelfClient,
): Promise<{
  [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
}> => {
  const catalog = await selfClient.loadDocumentCatalog();
  const allDocs: {
    [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
  } = {};

  for (const metadata of catalog.documents) {
    const data = await selfClient.loadDocumentById(metadata.id);
    if (data) {
      allDocs[metadata.id] = { data, metadata };
    }
  }

  return allDocs;
};

/**
 * Checks if there are any valid registered documents in the document catalog.
 *
 * @param client - The SelfClient instance to use for loading the document catalog.
 * @returns True if there are any valid registered documents, false otherwise.
 */
export const hasAnyValidRegisteredDocument = async (client: SelfClient): Promise<boolean> => {
  console.log('Checking if there are any valid registered documents');

  try {
    const catalog = await client.loadDocumentCatalog();

    return catalog.documents.some(doc => doc.isRegistered === true);
  } catch (error) {
    console.error('Error loading document catalog:', error);
    return false;
  }
};

export const loadSelectedDocument = async (
  selfClient: SelfClient,
): Promise<{
  data: PassportData;
  metadata: DocumentMetadata;
} | null> => {
  const catalog = await selfClient.loadDocumentCatalog();
  console.log('Catalog loaded');

  if (!catalog.selectedDocumentId) {
    console.log('No selectedDocumentId found');
    if (catalog.documents.length > 0) {
      console.log('Using first document as fallback');
      catalog.selectedDocumentId = catalog.documents[0].id;

      await selfClient.saveDocumentCatalog(catalog);
    } else {
      console.log('No documents in catalog, returning null');
      return null;
    }
  }

  const metadata = catalog.documents.find(d => d.id === catalog.selectedDocumentId);
  if (!metadata) {
    console.log('Metadata not found for selectedDocumentId:', catalog.selectedDocumentId);
    return null;
  }

  const data = await selfClient.loadDocumentById(catalog.selectedDocumentId);
  if (!data) {
    console.log('Document data not found for id:', catalog.selectedDocumentId);
    return null;
  }

  console.log('Successfully loaded document:', metadata.documentType);
  return { data, metadata };
};
