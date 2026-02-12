// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { generateMockDocument } from '@selfxyz/mobile-sdk-alpha';

import {
  deleteDocument,
  loadDocumentCatalogDirectlyFromKeychain,
  storeDocumentWithDeduplication,
  updateDocumentRegistrationState,
} from '@/providers/passportDataProvider';

/**
 * Constant indicating if the app is running in development mode.
 * Safely handles cases where __DEV__ might not be defined.
 * Use this constant instead of checking __DEV__ directly throughout the codebase.
 */
export const IS_DEV_MODE = typeof __DEV__ !== 'undefined' && __DEV__;
export const IS_EUCLID_ENABLED = false; // Enabled for proof request UI redesign

/**
 * Test documents configuration for visual testing of ID card backgrounds.
 * Each document will get a deterministic background based on its unique data.
 * Uses 3-letter ISO country codes for proper flag display.
 */
const TEST_DOCUMENTS = [
  {
    type: 'mock_passport' as const,
    country: 'USA',
    firstName: 'John',
    lastName: 'Smith',
    age: 35,
  },
  {
    type: 'mock_passport' as const,
    country: 'GBR',
    firstName: 'Emma',
    lastName: 'Wilson',
    age: 28,
  },
  {
    type: 'mock_passport' as const,
    country: 'JPN',
    firstName: 'Yuki',
    lastName: 'Tanaka',
    age: 42,
  },
  {
    type: 'mock_id_card' as const,
    country: 'DEU',
    firstName: 'Hans',
    lastName: 'Mueller',
    age: 31,
  },
  {
    type: 'mock_id_card' as const,
    country: 'FRA',
    firstName: 'Marie',
    lastName: 'Dubois',
    age: 25,
  },
  {
    type: 'mock_id_card' as const,
    country: 'CAN',
    firstName: 'Michael',
    lastName: 'Brown',
    age: 38,
  },
  {
    type: 'mock_aadhaar' as const,
    country: 'IND',
    firstName: 'Raj',
    lastName: 'Patel',
    age: 30,
  },
];

/**
 * Clears all existing documents from the catalog.
 * Only works in development mode.
 */
async function clearAllDocuments(): Promise<void> {
  const catalog = await loadDocumentCatalogDirectlyFromKeychain();
  console.log(`Clearing ${catalog.documents.length} existing documents...`);

  for (const doc of catalog.documents) {
    try {
      await deleteDocument(doc.id);
    } catch (error) {
      console.warn(`Failed to delete document ${doc.id}:`, error);
    }
  }
}

/**
 * Generates and stores multiple mock documents for testing ID card backgrounds.
 * Only works in development mode. Call this from HomeScreen to populate
 * the document list with various document types and countries.
 *
 * @returns Number of documents created
 */
export async function generateTestDocuments(): Promise<number> {
  if (!IS_DEV_MODE) {
    console.warn('generateTestDocuments only works in development mode');
    return 0;
  }

  // Clear existing documents first
  await clearAllDocuments();

  console.log('Generating test documents for background testing...');
  let created = 0;

  for (const doc of TEST_DOCUMENTS) {
    try {
      const mockDoc = await generateMockDocument({
        age: doc.age,
        expiryYears: 10,
        isInOfacList: false,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry: doc.country,
        selectedDocumentType: doc.type,
        firstName: doc.firstName,
        lastName: doc.lastName,
      });

      // Override mock flag to render as "real" document with colorful backgrounds
      mockDoc.mock = false;

      const documentId = await storeDocumentWithDeduplication(mockDoc);
      // Mark as registered so it shows the full card with background (not UnregisteredIdCard)
      await updateDocumentRegistrationState(documentId, true);
      created++;
      console.log(
        `Created ${doc.type} for ${doc.firstName} ${doc.lastName} (${doc.country})`,
      );
    } catch (error) {
      console.error(`Failed to create ${doc.type} for ${doc.country}:`, error);
    }
  }

  console.log(`Generated ${created} test documents`);
  return created;
}
