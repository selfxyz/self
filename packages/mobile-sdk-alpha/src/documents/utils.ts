// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  brutforceSignatureAlgorithmDsc,
  parseCertificateSimple,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '@selfxyz/common';
import { calculateContentHash, inferDocumentCategory } from '@selfxyz/common/utils';
import { DocumentMetadata, PassportData } from '@selfxyz/common/utils/types';

import { SelfClient } from '../types/public';

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

export async function markCurrentDocumentAsRegistered(selfClient: SelfClient): Promise<void> {
  const catalog = await selfClient.loadDocumentCatalog();

  if (catalog.selectedDocumentId) {
    await updateDocumentRegistrationState(selfClient, catalog.selectedDocumentId, true);
  } else {
    console.warn('No selected document to mark as registered');
  }
}

export async function reStorePassportDataWithRightCSCA(
  selfClient: SelfClient,
  passportData: PassportData,
  csca: string,
) {
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
  passportData: PassportData,
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
  const metadata: DocumentMetadata = {
    id: contentHash,
    documentType: passportData.documentType,
    documentCategory: passportData.documentCategory || inferDocumentCategory(passportData.documentType),
    data: passportData.mrz || '', // Store MRZ for passports/IDs, relevant data for aadhaar
    mock: passportData.mock || false,
    isRegistered: false,
  };

  catalog.documents.push(metadata);
  catalog.selectedDocumentId = contentHash;

  await selfClient.saveDocumentCatalog(catalog);

  return contentHash;
}

export async function storePassportData(selfClient: SelfClient, passportData: PassportData) {
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

    await selfClient.saveDocumentCatalog(catalog);

    console.log(`Updated registration state for document ${documentId}: ${isRegistered}`);
  } else {
    console.warn(`Document ${documentId} not found in catalog`);
  }
}
