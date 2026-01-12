// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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

import type { PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import Keychain from 'react-native-keychain';

import type {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from '@selfxyz/common/types/certificates';
import {
  brutforceSignatureAlgorithmDsc,
  calculateContentHash,
  inferDocumentCategory,
} from '@selfxyz/common/utils';
import { parseCertificateSimple } from '@selfxyz/common/utils/certificate_parsing/parseCertificateSimple';
import type {
  AadhaarData,
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
  PassportData,
} from '@selfxyz/common/utils/types';
import { isMRZDocument } from '@selfxyz/common/utils/types';
import type { DocumentsAdapter, SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { getAllDocuments, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { createKeychainOptions } from '@/integrations/keychain';
import { unsafe_getPrivateKey, useAuth } from '@/providers/authProvider';
import type { KeychainErrorType } from '@/utils/keychainErrors';
import {
  getKeychainErrorIdentity,
  isKeychainCryptoError,
  isUserCancellation,
} from '@/utils/keychainErrors';

let keychainCryptoFailureCallback:
  | ((errorType: 'user_cancelled' | 'crypto_failed') => void)
  | null = null;

export function setPassportKeychainErrorCallback(
  callback: ((errorType: 'user_cancelled' | 'crypto_failed') => void) | null,
) {
  keychainCryptoFailureCallback = callback;
}

function notifyKeychainFailure(type: KeychainErrorType) {
  if (keychainCryptoFailureCallback) {
    keychainCryptoFailureCallback(type);
  }
}

function handleKeychainReadError({
  contextLabel,
  error,
  throwOnUserCancel = false,
}: {
  contextLabel: string;
  error: unknown;
  throwOnUserCancel?: boolean;
}) {
  if (isUserCancellation(error)) {
    console.log(`User cancelled authentication for ${contextLabel}`);
    notifyKeychainFailure('user_cancelled');

    if (throwOnUserCancel) {
      throw error;
    }
  }

  if (isKeychainCryptoError(error)) {
    const err = getKeychainErrorIdentity(error);
    console.error(`Keychain crypto error loading ${contextLabel}:`, {
      code: err?.code,
      name: err?.name,
    });

    notifyKeychainFailure('crypto_failed');
  }

  console.log(`Error loading ${contextLabel}:`, error);
}

// Create safe wrapper functions to prevent undefined errors during early initialization
// These need to be declared early to avoid dependency issues
const safeLoadDocumentCatalog = async (): Promise<DocumentCatalog> => {
  try {
    return await loadDocumentCatalogDirectlyFromKeychain();
  } catch (error) {
    console.warn(
      'Error in safeLoadDocumentCatalog, returning empty catalog:',
      error,
    );
    return { documents: [] };
  }
};

const safeGetAllDocuments = async (selfClient: SelfClient) => {
  try {
    return await getAllDocuments(selfClient);
  } catch (error) {
    console.warn(
      'Error in safeGetAllDocuments, returning empty object:',
      error,
    );
    return {};
  }
};

type DocumentChangeCallback = (isMock: boolean) => void;

const documentChangeCallbacks: DocumentChangeCallback[] = [];

//keeps track of all the callbacks that need to be notified when the document changes
export const registerDocumentChangeCallback = (
  callback: DocumentChangeCallback,
) => {
  documentChangeCallbacks.push(callback);
};

const notifyDocumentChange = (isMock: boolean) => {
  documentChangeCallbacks.forEach(callback => {
    try {
      callback(isMock);
    } catch (error) {
      console.warn('Document change callback error:', error);
    }
  });
};

// ===== NEW STORAGE IMPLEMENTATION =====

// Global flag to track if native modules are ready
let nativeModulesReady = false;

// Test-only helper so unit tests can reset module-level state without re-importing
export function __resetPassportProviderTestState() {
  nativeModulesReady = false;
}

export const PassportContext = createContext<IPassportContext>({
  getData: () => Promise.resolve(null),
  getSelectedData: () => Promise.resolve(null),
  getAllData: () => Promise.resolve({}),
  getAvailableTypes: () => Promise.resolve([]),
  setData: storePassportData,
  getPassportDataAndSecret: () => Promise.resolve(null),
  getSelectedPassportDataAndSecret: () => Promise.resolve(null),
  clearSpecificData: clearSpecificPassportData,
  loadDocumentCatalog: safeLoadDocumentCatalog,
  getAllDocuments: () => Promise.resolve({}),
  setSelectedDocument: setSelectedDocument,
  deleteDocument: deleteDocument,
  migrateFromLegacyStorage: migrateFromLegacyStorage,
  getCurrentDocumentType: getCurrentDocumentType,
  clearDocumentCatalogForMigrationTesting:
    clearDocumentCatalogForMigrationTesting,
  updateDocumentRegistrationState: updateDocumentRegistrationState,
  checkIfAnyDocumentsNeedMigration: checkIfAnyDocumentsNeedMigration,
  checkAndUpdateRegistrationStates: checkAndUpdateRegistrationStates,
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const { _getSecurely, _getWithBiometrics } = useAuth();
  const selfClient = useSelfClient();

  const getData = useCallback(
    () =>
      _getWithBiometrics<PassportData | AadhaarData>(
        loadPassportData,
        str => JSON.parse(str),
        {
          requireAuth: true,
        },
      ),
    [_getWithBiometrics],
  );

  const getSelectedData = useCallback(() => {
    return _getSecurely<PassportData>(
      () => loadSelectedPassportData(),
      str => JSON.parse(str),
      {
        requireAuth: true,
      },
    );
  }, [_getSecurely]);

  const getAllData = useCallback(
    () => loadAllPassportData(selfClient),
    [selfClient],
  );

  const getAvailableTypes = useCallback(() => getAvailableDocumentTypes(), []);

  const getPassportDataAndSecret = useCallback(
    () =>
      _getSecurely<{ passportData: PassportData; secret: string }>(
        loadPassportDataAndSecret,
        str => JSON.parse(str),
        {
          requireAuth: true,
        },
      ),
    [_getSecurely],
  );

  const getSelectedPassportDataAndSecret = useCallback(() => {
    return _getSecurely<{ passportData: PassportData; secret: string }>(
      () => loadSelectedPassportDataAndSecret(),
      str => JSON.parse(str),
      {
        requireAuth: true,
      },
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
      clearSpecificData: clearSpecificPassportData,
      loadDocumentCatalog: safeLoadDocumentCatalog,
      getAllDocuments: () => safeGetAllDocuments(selfClient),
      setSelectedDocument: setSelectedDocument,
      deleteDocument: deleteDocument,
      migrateFromLegacyStorage: migrateFromLegacyStorage,
      getCurrentDocumentType: getCurrentDocumentType,
      clearDocumentCatalogForMigrationTesting:
        clearDocumentCatalogForMigrationTesting,
      updateDocumentRegistrationState: updateDocumentRegistrationState,
      checkIfAnyDocumentsNeedMigration: checkIfAnyDocumentsNeedMigration,
      checkAndUpdateRegistrationStates: checkAndUpdateRegistrationStates,
    }),
    [
      getData,
      getSelectedData,
      getAllData,
      getAvailableTypes,
      getPassportDataAndSecret,
      getSelectedPassportDataAndSecret,
      selfClient,
    ],
  );

  return (
    <PassportContext.Provider value={state}>
      {children}
    </PassportContext.Provider>
  );
};

export async function checkAndUpdateRegistrationStates(
  selfClient: SelfClient,
): Promise<void> {
  // Lazy import to avoid circular dependency
  const { checkAndUpdateRegistrationStates: validateDocCheckAndUpdate } =
    await import('@/proving/validateDocument');
  return validateDocCheckAndUpdate(selfClient);
}

export async function checkIfAnyDocumentsNeedMigration(): Promise<boolean> {
  try {
    const catalog = await loadDocumentCatalogDirectlyFromKeychain();
    return catalog.documents.some(doc => doc.isRegistered === undefined);
  } catch (error) {
    console.warn('Error checking if documents need migration:', error);
    return false;
  }
}

export async function clearDocumentCatalogForMigrationTesting() {
  console.log('Clearing document catalog for migration testing...');
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();

  // Delete all new-style documents
  for (const doc of catalog.documents) {
    try {
      await Keychain.resetGenericPassword({ service: `document-${doc.id}` });
      console.log(`Cleared document: ${doc.id}`);
    } catch {
      console.log(`Document ${doc.id} not found or already cleared`);
    }
  }

  // Clear the catalog itself
  try {
    await Keychain.resetGenericPassword({ service: 'documentCatalog' });
    console.log('Cleared document catalog');
  } catch {
    console.log('Document catalog not found or already cleared');
  }

  // Note: We intentionally do NOT clear legacy storage entries
  // (passportData, mockPassportData, etc.) so migration can be tested
  console.log(
    'Document catalog cleared. Legacy storage preserved for migration testing.',
  );
}

export async function clearSpecificPassportData(documentType: string) {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  const docsToDelete = catalog.documents.filter(
    d => d.documentType === documentType,
  );

  for (const doc of docsToDelete) {
    await deleteDocument(doc.id);
  }
}

export async function deleteDocumentDirectlyFromKeychain(
  documentId: string,
): Promise<void> {
  await Keychain.resetGenericPassword({ service: `document-${documentId}` });
}

export async function deleteDocument(documentId: string): Promise<void> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();

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

  await saveDocumentCatalogDirectlyToKeychain(catalog);

  // Delete the actual document
  try {
    await Keychain.resetGenericPassword({ service: `document-${documentId}` });
  } catch {
    console.log(`Document ${documentId} not found or already cleared`);
  }
}

export async function getAvailableDocumentTypes(): Promise<string[]> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  return [...new Set(catalog.documents.map(d => d.documentType))];
}

// Helper function to get current document type from catalog
export async function getCurrentDocumentType(): Promise<string | null> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  if (!catalog.selectedDocumentId) return null;

  const metadata = catalog.documents.find(
    d => d.id === catalog.selectedDocumentId,
  );
  return metadata?.documentType || null;
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

/**
 * Global initialization function to wait for native modules to be ready
 * Call this once at app startup before any native module operations
 */
export async function initializeNativeModules(
  maxRetries: number = 10,
  delay: number = 500,
): Promise<boolean> {
  if (nativeModulesReady) {
    return true;
  }

  console.log('Initializing native modules...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      if (typeof Keychain.getGenericPassword === 'function') {
        // Test if Keychain is actually available by making a safe call
        await Keychain.getGenericPassword({ service: 'test-availability' });
        nativeModulesReady = true;
        console.log('Native modules ready!');
        return true;
      }
    } catch (error) {
      // If we get a "requiring unknown module" error, wait and retry
      if (
        error instanceof Error &&
        error.message.includes('Requiring unknown module')
      ) {
        console.log(
          `Waiting for native modules to be ready (attempt ${i + 1}/${maxRetries})`,
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // For other errors (like service not found), assume Keychain is available
      nativeModulesReady = true;
      console.log('Native modules ready (with minor errors)!');
      return true;
    }
  }

  console.warn('Native modules not ready after retries');
  return false;
}

// TODO: is this used?
async function loadAllPassportData(selfClient: SelfClient): Promise<{
  [service: string]: IDDocument;
}> {
  const allDocs = await getAllDocuments(selfClient);
  const result: { [service: string]: IDDocument } = {};

  // Convert to legacy format for backward compatibility
  Object.values(allDocs).forEach(({ data, metadata }) => {
    const serviceName = getServiceNameForDocumentType(metadata.documentType);
    result[serviceName] = data;
  });

  return result;
}

export async function loadDocumentByIdDirectlyFromKeychain(
  documentId: string,
): Promise<PassportData | null> {
  try {
    // Check if native modules are ready
    if (!nativeModulesReady) {
      console.warn(
        `Native modules not ready for loading document ${documentId}, returning null`,
      );
      return null;
    }

    const documentCreds = await Keychain.getGenericPassword({
      service: `document-${documentId}`,
    });
    if (documentCreds !== false) {
      return JSON.parse(documentCreds.password);
    }
  } catch (error) {
    handleKeychainReadError({
      contextLabel: `document ${documentId}`,
      error,
    });
  }
  return null;
}

export const selfClientDocumentsAdapter: DocumentsAdapter = {
  loadDocumentCatalog: loadDocumentCatalogDirectlyFromKeychain,
  loadDocumentById: loadDocumentByIdDirectlyFromKeychain,
  saveDocumentCatalog: saveDocumentCatalogDirectlyToKeychain,
  deleteDocument: deleteDocumentDirectlyFromKeychain,
  saveDocument: storeDocumentDirectlyToKeychain,
};

export async function loadDocumentCatalogDirectlyFromKeychain(): Promise<DocumentCatalog> {
  try {
    // Extra safety check for module initialization
    if (typeof Keychain === 'undefined' || !Keychain) {
      console.warn(
        'Keychain module not yet initialized, returning empty catalog',
      );
      return { documents: [] };
    }

    // Check if native modules are ready (should be initialized at app startup)
    if (!nativeModulesReady) {
      console.warn('Native modules not ready, returning empty catalog');
      return { documents: [] };
    }

    const catalogCreds = await Keychain.getGenericPassword({
      service: 'documentCatalog',
    });
    if (catalogCreds !== false) {
      const parsed = JSON.parse(catalogCreds.password);
      // Handle case where JSON.parse(null) returns null
      if (parsed === null) {
        throw new TypeError('Cannot parse null password');
      }

      console.log('Successfully loaded document catalog from keychain');

      return parsed;
    }
  } catch (error) {
    handleKeychainReadError({
      contextLabel: 'document catalog',
      error,
      throwOnUserCancel: true,
    });
  }

  // Return empty catalog if none exists
  return { documents: [] };
}

export async function loadPassportData() {
  // Try new system first
  const selected = await loadSelectedDocumentDirectlyFromKeychain();
  if (selected) {
    return JSON.stringify(selected.data);
  }

  // Fallback to legacy system and migrate if found
  try {
    // Check if native modules are ready for legacy migration
    if (!nativeModulesReady) {
      console.warn(
        'Native modules not ready for legacy passport data migration',
      );
      return false;
    }

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
        const passportData: PassportData = JSON.parse(
          passportDataCreds.password,
        );
        await storeDocumentWithDeduplication(passportData);
        await Keychain.resetGenericPassword({ service });
        return passportDataCreds.password;
      }
    }
  } catch (error) {
    console.log('Error in legacy passport data migration:', error);
  }

  return false;
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

export async function loadSelectedDocumentDirectlyFromKeychain(): Promise<{
  data: PassportData;
  metadata: DocumentMetadata;
} | null> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  console.log('Catalog loaded');

  if (!catalog.selectedDocumentId) {
    console.log('No selectedDocumentId found');
    if (catalog.documents.length > 0) {
      console.log('Using first document as fallback');
      catalog.selectedDocumentId = catalog.documents[0].id;

      await saveDocumentCatalogDirectlyToKeychain(catalog);
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

  const data = await loadDocumentByIdDirectlyFromKeychain(
    catalog.selectedDocumentId,
  );
  if (!data) {
    console.log('Document data not found for id:', catalog.selectedDocumentId);
    return null;
  }

  console.log('Successfully loaded document:', metadata.documentType);
  return { data, metadata };
}

export async function loadSelectedPassportData(): Promise<string | false> {
  // Try new system first
  const selected = await loadSelectedDocumentDirectlyFromKeychain();
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

interface PassportProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IPassportContext {
  getData: () => Promise<{
    signature: string;
    data: PassportData | AadhaarData;
  } | null>;
  getSelectedData: () => Promise<{
    signature: string;
    data: PassportData;
  } | null>;
  // TODO: is this even used?
  getAllData: () => Promise<{ [service: string]: IDDocument }>;
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
  clearSpecificData: (documentType: string) => Promise<void>;

  loadDocumentCatalog: () => Promise<DocumentCatalog>;
  getAllDocuments: () => Promise<{
    [documentId: string]: { data: IDDocument; metadata: DocumentMetadata };
  }>;

  setSelectedDocument: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;

  migrateFromLegacyStorage: () => Promise<void>;
  getCurrentDocumentType: () => Promise<string | null>;
  clearDocumentCatalogForMigrationTesting: () => Promise<void>;
  updateDocumentRegistrationState: (
    documentId: string,
    isRegistered: boolean,
  ) => Promise<void>;
  checkIfAnyDocumentsNeedMigration: () => Promise<boolean>;
  checkAndUpdateRegistrationStates: (selfClient: SelfClient) => Promise<void>;
}

export async function migrateFromLegacyStorage(): Promise<void> {
  console.log('Migrating from legacy storage to new architecture...');
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();

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

export async function saveDocumentCatalogDirectlyToKeychain(
  catalog: DocumentCatalog,
): Promise<void> {
  const { setOptions } = await createKeychainOptions({ requireAuth: false });
  await Keychain.setGenericPassword('catalog', JSON.stringify(catalog), {
    service: 'documentCatalog',
    ...setOptions,
    // securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
}

export async function setDefaultDocumentTypeIfNeeded() {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();

  if (!catalog.selectedDocumentId && catalog.documents.length > 0) {
    await setSelectedDocument(catalog.documents[0].id);
  }
}

export async function setSelectedDocument(documentId: string): Promise<void> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  const metadata = catalog.documents.find(d => d.id === documentId);

  if (metadata) {
    catalog.selectedDocumentId = documentId;
    await saveDocumentCatalogDirectlyToKeychain(catalog);

    notifyDocumentChange(metadata.mock);
  }
}

async function storeDocumentDirectlyToKeychain(
  contentHash: string,
  passportData: PassportData | AadhaarData,
): Promise<void> {
  const { setOptions } = await createKeychainOptions({ requireAuth: false });
  await Keychain.setGenericPassword(contentHash, JSON.stringify(passportData), {
    service: `document-${contentHash}`,
    ...setOptions,
    // securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
}

// Duplicate funciton. prefer one on mobile sdk
export async function storeDocumentWithDeduplication(
  passportData: PassportData | AadhaarData,
): Promise<string> {
  const contentHash = calculateContentHash(passportData);
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();

  // Check for existing document with same content
  const existing = catalog.documents.find(d => d.id === contentHash);
  if (existing) {
    // Even if content hash is the same, we should update the document
    // in case metadata (like CSCA) has changed
    console.log('Document with same content exists, updating stored data');

    // Update the stored document with potentially new metadata
    await storeDocumentDirectlyToKeychain(contentHash, passportData);

    // Update selected document to this one
    catalog.selectedDocumentId = contentHash;
    await saveDocumentCatalogDirectlyToKeychain(catalog);
    return contentHash;
  }

  // Store new document using contentHash as service name
  await storeDocumentDirectlyToKeychain(contentHash, passportData);

  // Add to catalog
  const metadata: DocumentMetadata = {
    id: contentHash,
    documentType: passportData.documentType,
    documentCategory:
      passportData.documentCategory ||
      inferDocumentCategory(
        (passportData as PassportData | AadhaarData).documentType,
      ),
    data: isMRZDocument(passportData)
      ? (passportData as PassportData).mrz
      : (passportData as AadhaarData).qrData || '', // Store MRZ for passports/IDs, relevant data for aadhaar
    mock: passportData.mock || false,
    isRegistered: false,
  };

  catalog.documents.push(metadata);
  catalog.selectedDocumentId = contentHash;
  await saveDocumentCatalogDirectlyToKeychain(catalog);

  return contentHash;
}
// Duplicate function. prefer one in mobile sdk
export async function storePassportData(
  passportData: PassportData | AadhaarData,
) {
  await storeDocumentWithDeduplication(passportData);
}

export async function updateDocumentRegistrationState(
  documentId: string,
  isRegistered: boolean,
): Promise<void> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  const documentIndex = catalog.documents.findIndex(d => d.id === documentId);

  if (documentIndex !== -1) {
    catalog.documents[documentIndex].isRegistered = isRegistered;
    await saveDocumentCatalogDirectlyToKeychain(catalog);
    console.log(
      `Updated registration state for document ${documentId}: ${isRegistered}`,
    );
  } else {
    console.warn(`Document ${documentId} not found in catalog`);
  }
}

export const usePassport = () => {
  return useContext(PassportContext);
};

/**
 * Get all documents directly from the keychain.
 *
 * It's here to avoid dependency on self client where it's not strictly necessary,
 * for example when migrating legacy data.
 *
 * @returns A dictionary of document IDs to their data and metadata.
 */
export const getAllDocumentsDirectlyFromKeychain = async (): Promise<{
  [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
}> => {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  const allDocs: {
    [documentId: string]: { data: PassportData; metadata: DocumentMetadata };
  } = {};

  for (const metadata of catalog.documents) {
    const data = await loadDocumentByIdDirectlyFromKeychain(metadata.id);
    if (data) {
      allDocs[metadata.id] = { data, metadata };
    }
  }

  return allDocs;
};
