// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type { DocumentAttributes } from '@selfxyz/mobile-sdk-alpha';
export {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@selfxyz/mobile-sdk-alpha';

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

export function getNameAndSurname(nameSlice: string): {
  surname: string[];
  names: string[];
} {
  const parts = nameSlice.split('<<');
  if (parts.length < 2) {
    return { surname: [], names: [] };
  }

  const surname = parts[0].replace(/</g, '').trim();
  const namesString = parts[1];
  const names = namesString.split('<').filter(name => name.length > 0);

  return {
    surname: surname ? [surname] : [],
    names: names[0] ? [names[0]] : [],
  };
}
