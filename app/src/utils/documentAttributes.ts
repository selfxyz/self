// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData } from '@selfxyz/common';
import {
  attributeToPosition,
  attributeToPosition_ID,
} from '@selfxyz/common/constants';
import type { PassportData } from '@selfxyz/common/types/passport';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';

/**
 * Gets the scan prompt for a document type.
 * @param documentType - Document type code ('p' = Passport, 'i' = ID card, 'a' = Aadhaar)
 * @returns Scan prompt text
 */
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
 * we assume dateOfExpiry is this century because ICAO standard for biometric passport
 * became standard around 2002
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
  const todayUTC = new Date(
    Date.UTC(
      nowUTC.getFullYear(),
      nowUTC.getMonth(),
      nowUTC.getDate(),
      0,
      0,
      0,
      0,
    ),
  );

  return todayUTC >= expiryDateUTC;
}

/**
 * Formats date from YYMMDD format to DD/MM/YYYY format
 * For expiry (isDOB is false), we assume its this century because ICAO standard for biometric passport
 * became standard around 2002
 */
export function formatDateFromYYMMDD(
  dateString: string,
  isDOB: boolean = false,
): string {
  if (dateString.length !== 6) {
    return dateString;
  }

  const yy = parseInt(dateString.substring(0, 2), 10);
  const mm = dateString.substring(2, 4);
  const dd = dateString.substring(4, 6);

  const currentYear = new Date().getFullYear();
  const century = Math.floor(currentYear / 100) * 100;
  let year = century + yy;

  if (isDOB) {
    // For birth: if year is in the future, assume previous century
    if (year > currentYear) {
      year -= 100;
    }
  }

  return `${dd}/${mm}/${year}`;
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
    const year =
      extractedFields.yob.length === 4
        ? extractedFields.yob.slice(-2)
        : extractedFields.yob;
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
      extractedFields?.gender === 'M'
        ? 'M'
        : extractedFields?.gender === 'F'
          ? 'F'
          : extractedFields?.gender || '',
    expiryDateSlice: '', // Aadhaar doesn't expire
    isPassportType: false,
  };
}

/**
 * Extracts attributes from MRZ string (passport or ID card)
 */
function getPassportAttributes(
  mrz: string,
  documentCategory: string,
): DocumentAttributes {
  const isPassportType = documentCategory === 'passport';
  const attributePositions = isPassportType
    ? attributeToPosition
    : attributeToPosition_ID;

  const nameSlice = mrz.slice(
    attributePositions.name[0],
    attributePositions.name[1],
  );
  const dobSlice = mrz.slice(
    attributePositions.date_of_birth[0],
    attributePositions.date_of_birth[1] + 1,
  );
  const yobSlice = mrz.slice(
    attributePositions.date_of_birth[0],
    attributePositions.date_of_birth[0] + 2,
  );
  const issuingStateSlice = mrz.slice(
    attributePositions.issuing_state[0],
    attributePositions.issuing_state[1] + 1,
  );
  const nationalitySlice = mrz.slice(
    attributePositions.nationality[0],
    attributePositions.nationality[1] + 1,
  );
  const passNoSlice = mrz.slice(
    attributePositions.passport_number[0],
    attributePositions.passport_number[1] + 1,
  );
  const sexSlice = mrz.slice(
    attributePositions.gender[0],
    attributePositions.gender[1] + 1,
  );
  const expiryDateSlice = mrz.slice(
    attributePositions.expiry_date[0],
    attributePositions.expiry_date[1] + 1,
  );
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

// Helper functions to safely extract document data
export function getDocumentAttributes(
  document: PassportData | AadhaarData,
): DocumentAttributes {
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
 * Gets the display name for a document type code.
 * @param documentType - Document type code ('p' = Passport, 'i' = ID card, 'a' = Aadhaar)
 * @returns Human-readable document name
 */
export function getDocumentScanPrompt(
  documentType: string | undefined,
): string {
  const documentName = getDocumentTypeName(documentType);
  return `Scan your ${documentName}`;
}

export function getDocumentTypeName(documentType: string | undefined): string {
  switch (documentType) {
    case 'p':
      return 'Passport';
    case 'i':
      return 'ID';
    case 'a':
      return 'Aadhaar';
    default:
      return 'ID';
  }
}

/**
 * Parses name from MRZ format (surname<<given names)
 * Returns separated surname and names arrays
 */
export function getNameAndSurname(nameSlice: string): {
  surname: string[];
  names: string[];
} {
  // Split by double << to separate surname from names
  const parts = nameSlice.split('<<');
  if (parts.length < 2) {
    return { surname: [], names: [] };
  }

  // First part is surname, second part contains names separated by single <
  const surname = parts[0].replace(/</g, '').trim();
  const namesString = parts[1];

  // Split names by single < and filter out empty strings
  const names = namesString.split('<').filter(name => name.length > 0);

  return {
    surname: surname ? [surname] : [],
    names: names[0] ? [names[0]] : [],
  };
}
