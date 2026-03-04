// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/new-common';
import { createDocument } from '@selfxyz/new-common';

export interface DocumentAttributes {
  nameSlice: string;
  dobSlice: string;
  yobSlice: string;
  issuingStateSlice: string;
  nationalitySlice: string;
  passNoSlice: string;
  sexSlice: string;
  expiryDateSlice: string;
  isPassportType: boolean;
}

/**
 * Checks if a document expiration date (in YYMMDD format) has passed.
 * We assume dateOfExpiry is this century because ICAO standard for biometric passport
 * became standard around 2002.
 *
 * @param dateOfExpiry - Expiration date in YYMMDD format from MRZ
 * @returns true if the document is expired, false otherwise
 */
export function checkDocumentExpiration(dateOfExpiry: string): boolean {
  if (!dateOfExpiry || dateOfExpiry.length !== 6) {
    return false;
  }

  const year = parseInt(dateOfExpiry.slice(0, 2), 10);
  const fullyear = 2000 + year;
  const month = parseInt(dateOfExpiry.slice(2, 4), 10) - 1;
  const day = parseInt(dateOfExpiry.slice(4, 6), 10);

  const expiryDateUTC = new Date(Date.UTC(fullyear, month, day, 0, 0, 0, 0));
  const nowUTC = new Date();
  const todayUTC = new Date(Date.UTC(nowUTC.getFullYear(), nowUTC.getMonth(), nowUTC.getDate(), 0, 0, 0, 0));

  return todayUTC >= expiryDateUTC;
}

/**
 * Extracts document attributes using the IDocument adapter's getAttribute().
 * For MRZ documents (passport/ID card), nameSlice preserves the raw MRZ format
 * with << separators. For aadhaar/kyc, nameSlice appends << to the full name.
 */
export function getDocumentAttributes(document: IDDocument): DocumentAttributes {
  const doc = createDocument(document);

  const nameSlice =
    doc.category === 'passport' || doc.category === 'id_card'
      ? doc.getDisclosureSlice('name')
      : (doc.getAttribute('name') || '') + '<<';

  const dob = doc.getAttribute('date_of_birth') || '';

  return {
    nameSlice,
    dobSlice: dob,
    yobSlice: dob.slice(0, 2),
    issuingStateSlice: doc.getAttribute('issuing_state') || '',
    nationalitySlice: doc.getAttribute('nationality') || '',
    passNoSlice: doc.getAttribute('document_number') || '',
    sexSlice: doc.getAttribute('gender') || '',
    expiryDateSlice: doc.getAttribute('expiry_date') || '',
    isPassportType: doc.category === 'passport',
  };
}

/**
 * Checks if a document is valid for use in proving flows.
 * A document is valid if it is not expired.
 * Mock documents are considered valid for testing with staging environments.
 *
 * @param metadata - Document metadata from catalog
 * @param documentData - Full document data (optional, used for expiry check)
 * @returns true if document can be used for proving
 */
export function isDocumentValidForProving(metadata: DocumentMetadata, documentData?: IDDocument): boolean {
  if (documentData) {
    try {
      return !createDocument(documentData).isExpired();
    } catch {
      // If we can't check expiry, assume valid
    }
  }

  return true;
}

/**
 * Picks the best document to auto-select from a catalog.
 * Prefers the currently selected document if valid, otherwise picks the first valid one.
 *
 * @param catalog - Document catalog
 * @param documents - Map of document ID to document data
 * @returns Document ID to select, or undefined if no valid documents
 */
export function pickBestDocumentToSelect(
  catalog: DocumentCatalog,
  documents: Record<string, { data: IDDocument; metadata: DocumentMetadata }>,
): string | undefined {
  // Check if currently selected document is valid
  if (catalog.selectedDocumentId) {
    const selectedMeta = catalog.documents.find(doc => doc.id === catalog.selectedDocumentId);
    const selectedData = selectedMeta ? documents[catalog.selectedDocumentId] : undefined;

    if (selectedMeta && isDocumentValidForProving(selectedMeta, selectedData?.data)) {
      return catalog.selectedDocumentId;
    }
  }

  // Find first valid document
  const firstValid = catalog.documents.find(doc => {
    const docData = documents[doc.id];
    return isDocumentValidForProving(doc, docData?.data);
  });

  return firstValid?.id;
}
