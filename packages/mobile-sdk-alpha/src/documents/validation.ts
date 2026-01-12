// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData, DocumentMetadata, IDDocument } from '@selfxyz/common';
import { attributeToPosition, attributeToPosition_ID } from '@selfxyz/common/constants';
import type { PassportData } from '@selfxyz/common/types/passport';
import type { DocumentCatalog } from '@selfxyz/common/utils/types';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';

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
    return false; // Invalid format, don't treat as expired
  }

  const year = parseInt(dateOfExpiry.slice(0, 2), 10);
  const fullyear = 2000 + year;
  const month = parseInt(dateOfExpiry.slice(2, 4), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateOfExpiry.slice(4, 6), 10);

  const expiryDateUTC = new Date(Date.UTC(fullyear, month, day, 0, 0, 0, 0));
  const nowUTC = new Date();
  const todayUTC = new Date(Date.UTC(nowUTC.getFullYear(), nowUTC.getMonth(), nowUTC.getDate(), 0, 0, 0, 0));

  return todayUTC >= expiryDateUTC;
}

/**
 * Extracts attributes from Aadhaar document data
 */
function getAadhaarAttributes(document: AadhaarData): DocumentAttributes {
  const extractedFields = document.extractedFields;
  // For Aadhaar, we format the name to work with the existing getNameAndSurname function
  // We'll put the full name in the "surname" position and leave names empty
  const fullName = extractedFields?.name || '';
  const nameSliceFormatted = fullName ? `${fullName}<<` : ''; // Format like MRZ

  // Format DOB to YYMMDD for consistency with passport format
  let dobFormatted = '';
  if (extractedFields?.dob && extractedFields?.mob && extractedFields?.yob) {
    const year = extractedFields.yob.length === 4 ? extractedFields.yob.slice(-2) : extractedFields.yob;
    const month = extractedFields.mob.padStart(2, '0');
    const day = extractedFields.dob.padStart(2, '0');
    dobFormatted = `${year}${month}${day}`;
  }

  return {
    nameSlice: nameSliceFormatted,
    dobSlice: dobFormatted,
    yobSlice: extractedFields?.yob || '',
    issuingStateSlice: extractedFields?.state || '',
    nationalitySlice: 'IND', // Aadhaar is always Indian
    passNoSlice: extractedFields?.aadhaarLast4Digits || '',
    sexSlice:
      extractedFields?.gender === 'M' ? 'M' : extractedFields?.gender === 'F' ? 'F' : extractedFields?.gender || '',
    expiryDateSlice: '', // Aadhaar doesn't expire
    isPassportType: false,
  };
}

/**
 * Extracts attributes from MRZ string (passport or ID card)
 */
function getPassportAttributes(mrz: string, documentCategory: string): DocumentAttributes {
  const isPassportType = documentCategory === 'passport';
  const attributePositions = isPassportType ? attributeToPosition : attributeToPosition_ID;

  const nameSlice = mrz.slice(attributePositions.name[0], attributePositions.name[1]);
  const dobSlice = mrz.slice(attributePositions.date_of_birth[0], attributePositions.date_of_birth[1] + 1);
  const yobSlice = mrz.slice(attributePositions.date_of_birth[0], attributePositions.date_of_birth[0] + 2);
  const issuingStateSlice = mrz.slice(attributePositions.issuing_state[0], attributePositions.issuing_state[1] + 1);
  const nationalitySlice = mrz.slice(attributePositions.nationality[0], attributePositions.nationality[1] + 1);
  const passNoSlice = mrz.slice(attributePositions.passport_number[0], attributePositions.passport_number[1] + 1);
  const sexSlice = mrz.slice(attributePositions.gender[0], attributePositions.gender[1] + 1);
  const expiryDateSlice = mrz.slice(attributePositions.expiry_date[0], attributePositions.expiry_date[1] + 1);
  return {
    nameSlice,
    dobSlice,
    yobSlice,
    issuingStateSlice,
    nationalitySlice,
    passNoSlice,
    sexSlice,
    expiryDateSlice,
    isPassportType,
  };
}

/**
 * Extracts document attributes from passport, ID card, or Aadhaar data.
 *
 * @param document - Document data (PassportData, AadhaarData, or IDDocument)
 * @returns Document attributes including name, DOB, expiry date, etc.
 */
export function getDocumentAttributes(document: PassportData | AadhaarData): DocumentAttributes {
  if (isAadhaarDocument(document)) {
    return getAadhaarAttributes(document);
  } else if (isMRZDocument(document)) {
    return getPassportAttributes(document.mrz, document.documentCategory);
  } else {
    // Fallback for unknown document types
    return {
      nameSlice: '',
      dobSlice: '',
      yobSlice: '',
      issuingStateSlice: '',
      nationalitySlice: '',
      passNoSlice: '',
      sexSlice: '',
      expiryDateSlice: '',
      isPassportType: false,
    };
  }
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
  // Check if expired
  if (documentData) {
    try {
      const attributes = getDocumentAttributes(documentData);
      if (attributes.expiryDateSlice && checkDocumentExpiration(attributes.expiryDateSlice)) {
        return false;
      }
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
