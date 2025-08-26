// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Keychain from 'react-native-keychain';

import { loadDocumentCatalogDirectlyFromKeychain as loadDocumentCatalog } from '@/providers/passportDataProvider';

/**
 * Testing utility function to clear the document catalog for migration testing.
 * This function is only available in development/testing environments.
 *
 * @returns Promise<void>
 */
export async function clearDocumentCatalogForMigrationTesting(): Promise<void> {
  // Only allow this function in development/testing environments
  if (__DEV__ === false && process.env.NODE_ENV === 'production') {
    throw new Error(
      'clearDocumentCatalogForMigrationTesting is not available in production',
    );
  }

  console.log('Clearing document catalog for migration testing...');
  const catalog = await loadDocumentCatalog();

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
