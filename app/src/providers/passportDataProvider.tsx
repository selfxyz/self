// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/*
 * PROPOSED NEW STORAGE ARCHITECTURE FOR MULTIPLE DOCUMENTS
 *
 * Problem: Current approach stores one document per type, but users may have multiple passports
 *
 * Solution: Master Index + UUID Storage Pattern
 *
 * Structure:
 * 1. `documentCatalog` - Master index containing metadata for all documents
 * 2. `document-{uuid}` - Individual document storage with UUID keys
 * 3. `userPreferences` - Selected document and other preferences
 *
 * DocumentMetadata:
 * - id: string              // UUID for this document
 * - documentType: string    // passport, mock_passport, id_card, mock_id_card, aadhaar
 * - documentCategory: DocumentCategory  // PASSPORT, ID_CARD, AADHAAR for parsing logic
 * - contentHash: string     // SHA-256(eContent) for passports/IDs, custom for aadhaar
 * - dg1: string            // DG1 data for field extraction based on documentCategory
 * - mock: boolean          // whether this is a mock document
 *
 * Benefits:
 * - Supports unlimited documents per type
 * - Content deduplication via eContent hash (stable across PassportData changes)
 * - Fast discovery via master catalog
 * - Flexible field extraction via dg1 + documentCategory
 * - Efficient lookups and caching
 *
 * Storage Services:
 * - documentCatalog: { documents: DocumentMetadata[], selectedDocumentId?: string }
 * - document-{uuid}: PassportData (actual document content)
 * - userPreferences: { selectedDocumentId: string, defaultDocumentType: string }
 *
 * Field Extraction:
 * - Parse dg1 according to documentCategory rules
 * - Extract name, birthDate, nationality, etc. from dg1
 * - Display format determined by documentCategory
 */

import {
  brutforceSignatureAlgorithmDsc,
  DocumentCategory,
  parseCertificateSimple,
  PassportData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '@selfxyz/common';
import { sha256 } from 'js-sha256';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Keychain from 'react-native-keychain';

import { unsafe_getPrivateKey, useAuth } from '../providers/authProvider';
interface DocumentMetadata {
  id: string; // contentHash as ID for deduplication
  documentType: string; // passport, mock_passport, id_card, etc.
  documentCategory: DocumentCategory; // passport, id_card, aadhaar
  data: string; // DG1/MRZ data for passports/IDs, relevant data for aadhaar
  mock: boolean; // whether this is a mock document
}

interface DocumentCatalog {
  documents: DocumentMetadata[];
  selectedDocumentId?: string; // This is now a contentHash
}

// ===== NEW STORAGE IMPLEMENTATION =====

function calculateContentHash(passportData: PassportData): string {
  if (passportData.eContent) {
    // eContent is likely a buffer or array, convert to string properly
    const eContentStr =
      typeof passportData.eContent === 'string'
        ? passportData.eContent
        : JSON.stringify(passportData.eContent);
    return sha256(eContentStr);
  }
  // For documents without eContent (like aadhaar), hash core stable fields
  const stableData = {
    documentType: passportData.documentType,
    data: passportData.mrz || '', // Use mrz for passports/IDs, could be other data for aadhaar
    documentCategory: passportData.documentCategory,
  };
  return sha256(JSON.stringify(stableData));
}

function inferDocumentCategory(documentType: string): DocumentCategory {
  if (documentType.includes('passport')) {
    return 'passport' as DocumentCategory;
  } else if (documentType.includes('id')) {
    return 'id_card' as DocumentCategory;
  } else if (documentType.includes('aadhaar')) {
    return 'aadhaar' as DocumentCategory;
  }
  return 'passport' as DocumentCategory; // fallback
}

export async function loadDocumentCatalog(): Promise<DocumentCatalog> {
  try {
    const catalogCreds = await Keychain.getGenericPassword({
      service: 'documentCatalog',
    });
    if (catalogCreds !== false) {
      return JSON.parse(catalogCreds.password);
    }
  } catch (error) {
    console.log('Error loading document catalog:', error);
  }

  // Return empty catalog if none exists
  return { documents: [] };
}

export async function saveDocumentCatalog(
  catalog: DocumentCatalog,
): Promise<void> {
  await Keychain.setGenericPassword('catalog', JSON.stringify(catalog), {
    service: 'documentCatalog',
  });
}

export async function loadDocumentById(
  documentId: string,
): Promise<PassportData | null> {
  try {
    const documentCreds = await Keychain.getGenericPassword({
      service: `document-${documentId}`,
    });
    if (documentCreds !== false) {
      return JSON.parse(documentCreds.password);
    }
  } catch (error) {
    console.log(`Error loading document ${documentId}:`, error);
  }
  return null;
}

export async function storeDocumentWithDeduplication(
  passportData: PassportData,
): Promise<string> {
  const contentHash = calculateContentHash(passportData);
  const catalog = await loadDocumentCatalog();

  // Check for existing document with same content
  const existing = catalog.documents.find(d => d.id === contentHash);
  if (existing) {
    // Even if content hash is the same, we should update the document
    // in case metadata (like CSCA) has changed
    console.log('Document with same content exists, updating stored data');

    // Update the stored document with potentially new metadata
    await Keychain.setGenericPassword(
      contentHash,
      JSON.stringify(passportData),
      {
        service: `document-${contentHash}`,
      },
    );

    // Update selected document to this one
    catalog.selectedDocumentId = contentHash;
    await saveDocumentCatalog(catalog);
    return contentHash;
  }

  // Store new document using contentHash as service name
  await Keychain.setGenericPassword(contentHash, JSON.stringify(passportData), {
    service: `document-${contentHash}`,
  });

  // Add to catalog
  const metadata: DocumentMetadata = {
    id: contentHash,
    documentType: passportData.documentType,
    documentCategory:
      passportData.documentCategory ||
      inferDocumentCategory(passportData.documentType),
    data: passportData.mrz || '', // Store MRZ for passports/IDs, relevant data for aadhaar
    mock: passportData.mock || false,
  };

  catalog.documents.push(metadata);
  catalog.selectedDocumentId = contentHash;
  await saveDocumentCatalog(catalog);

  return contentHash;
}

export async function loadSelectedDocument(): Promise<{
  data: PassportData;
  metadata: DocumentMetadata;
} | null> {
  const catalog = await loadDocumentCatalog();
  console.log('Catalog loaded');

  if (!catalog.selectedDocumentId) {
    console.log('No selectedDocumentId found');
    if (catalog.documents.length > 0) {
      console.log('Using first document as fallback');
      catalog.selectedDocumentId = catalog.documents[0].id;
      await saveDocumentCatalog(catalog);
    } else {
      console.log('No documents in catalog, returning null');
      return null;
    }
  }

  const metadata = catalog.documents.find(
    d => d.id === catalog.selectedDocumentId,
  );
  if (!metadata) {
    console.log(
      'Metadata not found for selectedDocumentId:',
      catalog.selectedDocumentId,
    );
    return null;
  }

  const data = await loadDocumentById(catalog.selectedDocumentId);
  if (!data) {
    console.log('Document data not found for id:', catalog.selectedDocumentId);
    return null;
  }

  console.log('Successfully loaded document:', metadata.documentType);
  return { data, metadata };
}

export async function getAllDocuments(): Promise<{
  [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
}> {
  const catalog = await loadDocumentCatalog();
  const allDocs: {
    [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
  } = {};

  for (const metadata of catalog.documents) {
    const data = await loadDocumentById(metadata.id);
    if (data) {
      allDocs[metadata.id] = { data, metadata };
    }
  }

  return allDocs;
}

export async function setSelectedDocument(documentId: string): Promise<void> {
  const catalog = await loadDocumentCatalog();
  const metadata = catalog.documents.find(d => d.id === documentId);

  if (metadata) {
    catalog.selectedDocumentId = documentId;
    await saveDocumentCatalog(catalog);
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  const catalog = await loadDocumentCatalog();

  // Remove from catalog
  catalog.documents = catalog.documents.filter(d => d.id !== documentId);

  // Update selected document if it was deleted
  if (catalog.selectedDocumentId === documentId) {
    if (catalog.documents.length > 0) {
      catalog.selectedDocumentId = catalog.documents[0].id;
    } else {
      catalog.selectedDocumentId = undefined;
    }
  }

  await saveDocumentCatalog(catalog);

  // Delete the actual document
  try {
    await Keychain.resetGenericPassword({ service: `document-${documentId}` });
  } catch (error) {
    console.log(`Document ${documentId} not found or already cleared`);
  }
}

export async function getAvailableDocumentTypes(): Promise<string[]> {
  const catalog = await loadDocumentCatalog();
  return [...new Set(catalog.documents.map(d => d.documentType))];
}

export async function migrateFromLegacyStorage(): Promise<void> {
  console.log('Migrating from legacy storage to new architecture...');
  const catalog = await loadDocumentCatalog();

  // If catalog already has documents, skip migration
  if (catalog.documents.length > 0) {
    console.log('Migration already completed');
    return;
  }

  const legacyServices = [
    'passportData',
    'mockPassportData',
    'idCardData',
    'mockIdCardData',
  ];
  for (const service of legacyServices) {
    try {
      const passportDataCreds = await Keychain.getGenericPassword({ service });
      if (passportDataCreds !== false) {
        const passportData: PassportData = JSON.parse(
          passportDataCreds.password,
        );
        await storeDocumentWithDeduplication(passportData);
        await Keychain.resetGenericPassword({ service });
        console.log(`Migrated document from ${service}`);
      }
    } catch (error) {
      console.log(`Could not migrate from service ${service}:`, error);
    }
  }

  console.log('Migration completed');
}

// ===== LEGACY WRAPPER FUNCTIONS (for backward compatibility) =====

function getServiceNameForDocumentType(documentType: string): string {
  // These are now only used for legacy compatibility
  switch (documentType) {
    case 'passport':
      return 'passportData';
    case 'mock_passport':
      return 'mockPassportData';
    case 'id_card':
      return 'idCardData';
    case 'mock_id_card':
      return 'mockIdCardData';
    default:
      return 'passportData';
  }
}

export async function loadPassportData() {
  // Try new system first
  const selected = await loadSelectedDocument();
  if (selected) {
    return JSON.stringify(selected.data);
  }

  // Fallback to legacy system and migrate if found
  const services = [
    'passportData',
    'mockPassportData',
    'idCardData',
    'mockIdCardData',
  ];
  for (const service of services) {
    const passportDataCreds = await Keychain.getGenericPassword({ service });
    if (passportDataCreds !== false) {
      // Migrate this document
      const passportData: PassportData = JSON.parse(passportDataCreds.password);
      await storeDocumentWithDeduplication(passportData);
      await Keychain.resetGenericPassword({ service });
      return passportDataCreds.password;
    }
  }

  return false;
}

export async function loadSelectedPassportData(): Promise<string | false> {
  // Try new system first
  const selected = await loadSelectedDocument();
  if (selected) {
    return JSON.stringify(selected.data);
  }

  // Fallback to legacy system
  return await loadPassportData();
}

export async function loadSelectedPassportDataAndSecret() {
  const passportData = await loadSelectedPassportData();
  const secret = await unsafe_getPrivateKey();
  if (!secret || !passportData) {
    return false;
  }
  return JSON.stringify({
    secret,
    passportData: JSON.parse(passportData),
  });
}

export async function loadAllPassportData(): Promise<{
  [service: string]: PassportData;
}> {
  const allDocs = await getAllDocuments();
  const result: { [service: string]: PassportData } = {};

  // Convert to legacy format for backward compatibility
  Object.values(allDocs).forEach(({ data, metadata }) => {
    const serviceName = getServiceNameForDocumentType(metadata.documentType);
    result[serviceName] = data;
  });

  return result;
}

export async function setDefaultDocumentTypeIfNeeded() {
  const catalog = await loadDocumentCatalog();

  if (!catalog.selectedDocumentId && catalog.documents.length > 0) {
    await setSelectedDocument(catalog.documents[0].id);
  }
}

export async function loadPassportDataAndSecret() {
  const passportData = await loadPassportData();
  const secret = await unsafe_getPrivateKey();
  if (!secret || !passportData) {
    return false;
  }
  return JSON.stringify({
    secret,
    passportData: JSON.parse(passportData),
  });
}

export async function storePassportData(passportData: PassportData) {
  await storeDocumentWithDeduplication(passportData);
}

export async function clearPassportData() {
  const catalog = await loadDocumentCatalog();

  // Delete all documents
  for (const doc of catalog.documents) {
    try {
      await Keychain.resetGenericPassword({ service: `document-${doc.id}` });
    } catch (error) {
      console.log(`Document ${doc.id} not found or already cleared`);
    }
  }

  // Clear catalog
  await saveDocumentCatalog({ documents: [] });
}

export async function clearSpecificPassportData(documentType: string) {
  const catalog = await loadDocumentCatalog();
  const docsToDelete = catalog.documents.filter(
    d => d.documentType === documentType,
  );

  for (const doc of docsToDelete) {
    await deleteDocument(doc.id);
  }
}

export async function clearDocumentCatalogForMigrationTesting() {
  console.log('Clearing document catalog for migration testing...');
  const catalog = await loadDocumentCatalog();

  // Delete all new-style documents
  for (const doc of catalog.documents) {
    try {
      await Keychain.resetGenericPassword({ service: `document-${doc.id}` });
      console.log(`Cleared document: ${doc.id}`);
    } catch (error) {
      console.log(`Document ${doc.id} not found or already cleared`);
    }
  }

  // Clear the catalog itself
  try {
    await Keychain.resetGenericPassword({ service: 'documentCatalog' });
    console.log('Cleared document catalog');
  } catch (error) {
    console.log('Document catalog not found or already cleared');
  }

  // Note: We intentionally do NOT clear legacy storage entries
  // (passportData, mockPassportData, etc.) so migration can be tested
  console.log(
    'Document catalog cleared. Legacy storage preserved for migration testing.',
  );
}

interface PassportProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IPassportContext {
  getData: () => Promise<{ signature: string; data: PassportData } | null>;
  getSelectedData: () => Promise<{
    signature: string;
    data: PassportData;
  } | null>;
  getAllData: () => Promise<{ [service: string]: PassportData }>;
  getAvailableTypes: () => Promise<string[]>;
  setData: (data: PassportData) => Promise<void>;
  getPassportDataAndSecret: () => Promise<{
    data: { passportData: PassportData; secret: string };
    signature: string;
  } | null>;
  getSelectedPassportDataAndSecret: () => Promise<{
    data: { passportData: PassportData; secret: string };
    signature: string;
  } | null>;
  clearPassportData: () => Promise<void>;
  clearSpecificData: (documentType: string) => Promise<void>;
  loadDocumentCatalog: () => Promise<DocumentCatalog>;
  getAllDocuments: () => Promise<{
    [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
  }>;
  setSelectedDocument: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  migrateFromLegacyStorage: () => Promise<void>;
  getCurrentDocumentType: () => Promise<string | null>;
  clearDocumentCatalogForMigrationTesting: () => Promise<void>;
}

export const PassportContext = createContext<IPassportContext>({
  getData: () => Promise.resolve(null),
  getSelectedData: () => Promise.resolve(null),
  getAllData: () => Promise.resolve({}),
  getAvailableTypes: () => Promise.resolve([]),
  setData: storePassportData,
  getPassportDataAndSecret: () => Promise.resolve(null),
  getSelectedPassportDataAndSecret: () => Promise.resolve(null),
  clearPassportData: clearPassportData,
  clearSpecificData: clearSpecificPassportData,
  loadDocumentCatalog: loadDocumentCatalog,
  getAllDocuments: getAllDocuments,
  setSelectedDocument: setSelectedDocument,
  deleteDocument: deleteDocument,
  migrateFromLegacyStorage: migrateFromLegacyStorage,
  getCurrentDocumentType: getCurrentDocumentType,
  clearDocumentCatalogForMigrationTesting:
    clearDocumentCatalogForMigrationTesting,
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const { _getSecurely } = useAuth();

  const getData = useCallback(
    () => _getSecurely<PassportData>(loadPassportData, str => JSON.parse(str)),
    [_getSecurely],
  );

  const getSelectedData = useCallback(() => {
    return _getSecurely<PassportData>(
      () => loadSelectedPassportData(),
      str => JSON.parse(str),
    );
  }, [_getSecurely]);

  const getAllData = useCallback(() => loadAllPassportData(), []);

  const getAvailableTypes = useCallback(() => getAvailableDocumentTypes(), []);

  const getPassportDataAndSecret = useCallback(
    () =>
      _getSecurely<{ passportData: PassportData; secret: string }>(
        loadPassportDataAndSecret,
        str => JSON.parse(str),
      ),
    [_getSecurely],
  );

  const getSelectedPassportDataAndSecret = useCallback(() => {
    return _getSecurely<{ passportData: PassportData; secret: string }>(
      () => loadSelectedPassportDataAndSecret(),
      str => JSON.parse(str),
    );
  }, [_getSecurely]);

  const state: IPassportContext = useMemo(
    () => ({
      getData,
      getSelectedData,
      getAllData,
      getAvailableTypes,
      setData: storePassportData,
      getPassportDataAndSecret,
      getSelectedPassportDataAndSecret,
      clearPassportData: clearPassportData,
      clearSpecificData: clearSpecificPassportData,
      loadDocumentCatalog: loadDocumentCatalog,
      getAllDocuments: getAllDocuments,
      setSelectedDocument: setSelectedDocument,
      deleteDocument: deleteDocument,
      migrateFromLegacyStorage: migrateFromLegacyStorage,
      getCurrentDocumentType: getCurrentDocumentType,
      clearDocumentCatalogForMigrationTesting:
        clearDocumentCatalogForMigrationTesting,
    }),
    [
      getData,
      getSelectedData,
      getAllData,
      getAvailableTypes,
      getPassportDataAndSecret,
      getSelectedPassportDataAndSecret,
    ],
  );

  return (
    <PassportContext.Provider value={state}>
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = () => {
  return useContext(PassportContext);
};

export async function reStorePassportDataWithRightCSCA(
  passportData: PassportData,
  csca: string,
) {
  const cscaInCurrentPassporData = passportData.passportMetadata?.csca;
  if (!(csca === cscaInCurrentPassporData)) {
    const cscaParsed = parseCertificateSimple(csca);
    const dscCertData = brutforceSignatureAlgorithmDsc(
      passportData.dsc_parsed!,
      cscaParsed,
    );

    if (
      passportData.passportMetadata &&
      dscCertData &&
      cscaParsed.publicKeyDetails
    ) {
      passportData.passportMetadata.csca = csca;
      passportData.passportMetadata.cscaFound = true;
      passportData.passportMetadata.cscaHashFunction =
        dscCertData.hashAlgorithm;
      passportData.passportMetadata.cscaSignatureAlgorithm =
        dscCertData.signatureAlgorithm;
      passportData.passportMetadata.cscaSaltLength = dscCertData.saltLength;

      const cscaCurveOrExponent =
        cscaParsed.signatureAlgorithm === 'rsapss' ||
        cscaParsed.signatureAlgorithm === 'rsa'
          ? (cscaParsed.publicKeyDetails as PublicKeyDetailsRSA).exponent
          : (cscaParsed.publicKeyDetails as PublicKeyDetailsECDSA).curve;

      passportData.passportMetadata.cscaCurveOrExponent = cscaCurveOrExponent;
      passportData.passportMetadata.cscaSignatureAlgorithmBits = parseInt(
        cscaParsed.publicKeyDetails.bits,
        10,
      );

      passportData.csca_parsed = cscaParsed;

      await storePassportData(passportData);
    }
  }
}

// Helper function to get current document type from catalog
export async function getCurrentDocumentType(): Promise<string | null> {
  const catalog = await loadDocumentCatalog();
  if (!catalog.selectedDocumentId) return null;

  const metadata = catalog.documents.find(
    d => d.id === catalog.selectedDocumentId,
  );
  return metadata?.documentType || null;
}
