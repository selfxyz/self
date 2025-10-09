// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type {
  AadhaarData,
  DocumentMetadata,
  IDDocument,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '@selfxyz/common';
import {
  brutforceSignatureAlgorithmDsc,
  calculateContentHash,
  inferDocumentCategory,
  isAadhaarDocument,
  isMRZDocument,
  parseCertificateSimple,
} from '@selfxyz/common';

import { extractNameFromMRZ } from '../processing/mrz';
import type { SelfClient } from '../types/public';

export async function clearPassportData(selfClient: SelfClient) {
  const catalog = await selfClient.loadDocumentCatalog();

  // Delete all documents
  for (const doc of catalog.documents) {
    try {
      await selfClient.deleteDocument(doc.id);
    } catch {
      console.log(`Document ${doc.id} not found or already cleared`);
    }
  }

  // Clear catalog
  await selfClient.saveDocumentCatalog({ documents: [] });
}

/**
 * Extract name from a document by loading its full data.
 * Works for both MRZ documents (passport/ID card) and Aadhaar documents.
 *
 * @param selfClient - The SelfClient instance
 * @param documentId - The document ID to extract name from
 * @returns Object with firstName and lastName, or null if extraction fails
 */
export async function extractNameFromDocument(
  selfClient: SelfClient,
  documentId: string,
): Promise<{ firstName: string; lastName: string } | null> {
  try {
    const document = await selfClient.loadDocumentById(documentId);
    if (!document) {
      return null;
    }

    // For Aadhaar documents, extract name from extractedFields
    if (isAadhaarDocument(document)) {
      const name = document.extractedFields?.name;
      if (name && typeof name === 'string') {
        // Aadhaar name is typically "FIRSTNAME LASTNAME" format
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
          const firstName = parts[0];
          const lastName = parts.slice(1).join(' ');
          return { firstName, lastName };
        } else if (parts.length === 1) {
          return { firstName: parts[0], lastName: '' };
        }
      }
      return null;
    }

    // For MRZ documents (passport/ID card), extract from MRZ string
    if (isMRZDocument(document)) {
      return extractNameFromMRZ(document.mrz);
    }

    return null;
  } catch (error) {
    console.error('Error extracting name from document:', error);
    return null;
  }
}

/**
 * Gets all documents from the document catalog.
 *
 * @param selfClient - The SelfClient instance to use for loading the document catalog.
 * @returns A dictionary of document IDs to their data and metadata.
 */
export const getAllDocuments = async (
  selfClient: SelfClient,
): Promise<{
  [documentId: string]: { data: IDDocument; metadata: DocumentMetadata };
}> => {
  const catalog = await selfClient.loadDocumentCatalog();
  const allDocs: {
    [documentId: string]: { data: IDDocument; metadata: DocumentMetadata };
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
  data: IDDocument;
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

export async function markCurrentDocumentAsRegistered(selfClient: SelfClient): Promise<void> {
  const catalog = await selfClient.loadDocumentCatalog();

  if (catalog.selectedDocumentId) {
    await updateDocumentRegistrationState(selfClient, catalog.selectedDocumentId, true);
  } else {
    console.warn('No selected document to mark as registered');
  }
}

export async function reStorePassportDataWithRightCSCA(selfClient: SelfClient, passportData: IDDocument, csca: string) {
  if (passportData.documentCategory === 'aadhaar') {
    return;
  }
  const cscaInCurrentPassporData = passportData.passportMetadata?.csca;
  if (!(csca === cscaInCurrentPassporData)) {
    const cscaParsed = parseCertificateSimple(csca);
    const dscCertData = brutforceSignatureAlgorithmDsc(passportData.dsc_parsed!, cscaParsed);

    if (passportData.passportMetadata && dscCertData && cscaParsed.publicKeyDetails) {
      passportData.passportMetadata.csca = csca;
      passportData.passportMetadata.cscaFound = true;
      passportData.passportMetadata.cscaHashFunction = dscCertData.hashAlgorithm;
      passportData.passportMetadata.cscaSignatureAlgorithm = dscCertData.signatureAlgorithm;
      passportData.passportMetadata.cscaSaltLength = dscCertData.saltLength;

      const cscaCurveOrExponent =
        cscaParsed.signatureAlgorithm === 'rsapss' || cscaParsed.signatureAlgorithm === 'rsa'
          ? (cscaParsed.publicKeyDetails as PublicKeyDetailsRSA).exponent
          : (cscaParsed.publicKeyDetails as PublicKeyDetailsECDSA).curve;

      passportData.passportMetadata.cscaCurveOrExponent = cscaCurveOrExponent;
      passportData.passportMetadata.cscaSignatureAlgorithmBits = parseInt(cscaParsed.publicKeyDetails.bits, 10);

      passportData.csca_parsed = cscaParsed;

      await storePassportData(selfClient, passportData);
    }
  }
}

export async function storeDocumentWithDeduplication(
  selfClient: SelfClient,
  passportData: IDDocument,
): Promise<string> {
  const contentHash = calculateContentHash(passportData);
  const catalog = await selfClient.loadDocumentCatalog();

  // Check for existing document with same content
  const existing = catalog.documents.find(d => d.id === contentHash);
  if (existing) {
    // Even if content hash is the same, we should update the document
    // in case metadata (like CSCA) has changed
    console.log('Document with same content exists, updating stored data');

    // Update the stored document with potentially new metadata
    await selfClient.saveDocument(contentHash, passportData);

    // Update selected document to this one
    catalog.selectedDocumentId = contentHash;
    await selfClient.saveDocumentCatalog(catalog);
    return contentHash;
  }

  // Store new document using contentHash as service name
  await selfClient.saveDocument(contentHash, passportData);

  // Add to catalog
  const docType = passportData.documentType;
  const metadata: DocumentMetadata = {
    id: contentHash,
    documentType: docType,
    documentCategory: passportData.documentCategory || inferDocumentCategory(docType),
    data: isMRZDocument(passportData) ? passportData.mrz : (passportData as AadhaarData).qrData || '',
    mock: passportData.mock || false,
    isRegistered: false,
  };

  catalog.documents.push(metadata);
  catalog.selectedDocumentId = contentHash;

  await selfClient.saveDocumentCatalog(catalog);

  return contentHash;
}

export async function storePassportData(selfClient: SelfClient, passportData: IDDocument) {
  await storeDocumentWithDeduplication(selfClient, passportData);
}

export async function updateDocumentRegistrationState(
  selfClient: SelfClient,
  documentId: string,
  isRegistered: boolean,
): Promise<void> {
  const catalog = await selfClient.loadDocumentCatalog();
  const documentIndex = catalog.documents.findIndex(d => d.id === documentId);

  if (documentIndex !== -1) {
    catalog.documents[documentIndex].isRegistered = isRegistered;

    // Set registration timestamp when marking as registered
    if (isRegistered) {
      catalog.documents[documentIndex].registeredAt = Date.now();
    } else {
      // Clear timestamp when unregistering
      catalog.documents[documentIndex].registeredAt = undefined;
    }

    await selfClient.saveDocumentCatalog(catalog);

    console.log(`Updated registration state for document ${documentId}: ${isRegistered}`);
  } else {
    console.warn(`Document ${documentId} not found in catalog`);
  }
}
