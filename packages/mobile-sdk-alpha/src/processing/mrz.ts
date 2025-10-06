// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { MrzParseError } from '../errors';
import type { MRZInfo, MRZValidation } from '../types/public';

/**
 * Calculate check digit for MRZ fields using ICAO 9303 standard
 */
function calculateCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    let value: number;

    if (char >= '0' && char <= '9') {
      value = parseInt(char, 10);
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else if (char === '<') {
      value = 0;
    } else {
      throw new MrzParseError(`Invalid character in MRZ: ${char}`);
    }

    sum += value * weights[i % 3];
  }

  return sum % 10;
}

/**
 * Verify check digit for a given field
 */
function verifyCheckDigit(field: string, expectedCheckDigit: string): boolean {
  // Only numeric check digits are valid per ICAO 9303
  if (!/^\d$/.test(expectedCheckDigit)) {
    return false;
  }
  const expected = parseInt(expectedCheckDigit, 10);
  try {
    const calculated = calculateCheckDigit(field);
    return calculated === expected;
  } catch {
    return false;
  }
}

/**
 * Validate TD3 MRZ format (passport/travel document)
 */
function validateTD3Format(lines: string[]): boolean {
  if (lines.length !== 2) {
    return false;
  }
  const TD3_line_2_REGEX = /^([A-Z0-9<]{9})([0-9ILDSOG])([A-Z<]{3})/;
  const isTD3 = TD3_line_2_REGEX.test(lines[1]);
  return isTD3;
}

function validateTD1Format(lines: string[]): boolean {
  console.log('validateTD1Format', lines);

  const concatenatedLines = lines[0] + lines[1];
  const TD1_REGEX =
    /^(?<documentType>[A-Z0-9<]{2})(?<issuingCountry>[A-Z<]{3})(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9]{1})(?<optionalData1>[A-Z0-9<]{15})(?<dateOfBirth>[0-9]{6})(?<checkDigitDateOfBirth>[0-9]{1})(?<sex>[MF<]{1})(?<dateOfExpiry>[0-9]{6})(?<checkDigitDateOfExpiry>[0-9]{1})(?<nationality>[A-Z<]{3})(?<optionalData2>[A-Z0-9<]{7})/;
  const isTD1 = TD1_REGEX.test(concatenatedLines) || lines[0].startsWith('I');
  return isTD1;
}

/**
 * Extract MRZ information from TD3 format
 * TD3 Line 1: DOCUMENTTYPE(1)SUBTYPE(1)ISSUINGCOUNTRY(3)SURNAME<<GIVENNAMES<<<<<<<<<<<<<<<<<<
 * TD3 Line 2: PASSPORT(9)CHECK(1)NATIONALITY(3)DOB(6)DOBCHECK(1)SEX(1)EXPIRY(6)EXPIRYCHECK(1)OPTIONAL(7)FINALCHECK(1)
 */
function extractTD3Info(lines: string[]): Omit<MRZInfo, 'validation'> {
  const line1 = lines[0];
  const line2 = lines[1];

  // Line 1: P<CCCSURNAME<<GIVENNAMES<<<<<<<<<<<<<<<<<<
  const documentType = line1.slice(0, 1);
  const issuingCountry = line1
    .slice(2, 5)
    .replace(/</g, '')
    .replace(/[^A-Z]/g, '');

  // Line 2: PASSPORT(9)CHECK(1)NATIONALITY(3)DOB(6)DOBCHECK(1)SEX(1)EXPIRY(6)EXPIRYCHECK(1)OPTIONAL(7)FINALCHECK(1)
  const documentNumber = line2.slice(0, 9).replace(/</g, '');

  // Robust nationality extraction: scan 4-character window for three contiguous A-Z letters
  const rawNat = line2.slice(10, 14);
  let nationality = '';

  // Look for a 3-letter uppercase sequence in the window
  for (let i = 0; i <= rawNat.length - 3; i++) {
    const candidate = rawNat.slice(i, i + 3);
    if (/^[A-Z]{3}$/.test(candidate)) {
      nationality = candidate;
      break;
    }
  }

  // If no 3-letter sequence found, fall back to original slice(10,13) with non-letters removed
  if (!nationality) {
    nationality = rawNat.slice(0, 3).replace(/[^A-Z]/g, '');
  }
  const dateOfBirth = line2.slice(13, 19);
  const dateOfExpiry = line2.slice(21, 27);

  return {
    documentType,
    issuingCountry,
    documentNumber,
    dateOfBirth,
    dateOfExpiry,
  };
}

function extractTD1Info(lines: string[]): Omit<MRZInfo, 'validation'> {
  const line1 = lines[0];
  const line2 = lines[1];

  const concatenatedLines = line1 + line2;

  return {
    documentType: concatenatedLines.slice(0, 2),
    issuingCountry: concatenatedLines.slice(2, 5),
    documentNumber: concatenatedLines.slice(5, 14).replace(/</g, '').trim(),
    dateOfBirth: concatenatedLines.slice(30, 36),
    dateOfExpiry: concatenatedLines.slice(38, 44),
  };
}

/**
 * Validate all check digits for TD1 MRZ format
 */
function validateTD1CheckDigits(lines: string[]): Omit<MRZValidation, 'format' | 'overall'> {
  const line1 = lines[0];
  const line2 = lines[1];
  const concatenatedLines = line1 + line2;

  const documentNumber = concatenatedLines.slice(5, 14);
  const documentNumberCheckDigit = concatenatedLines.slice(14, 15);
  const dateOfBirth = concatenatedLines.slice(30, 36);
  const dobCheckDigit = concatenatedLines.slice(36, 37);
  const dateOfExpiry = concatenatedLines.slice(38, 44);
  const expiryCheckDigit = concatenatedLines.slice(44, 45);

  return {
    passportNumberChecksum: verifyCheckDigit(documentNumber, documentNumberCheckDigit),
    dateOfBirthChecksum: verifyCheckDigit(dateOfBirth, dobCheckDigit),
    dateOfExpiryChecksum: verifyCheckDigit(dateOfExpiry, expiryCheckDigit),
    compositeChecksum: true, // TD1 doesn't have a composite check digit like TD3
  };
}

/**
 * Validate all check digits for TD3 MRZ
 * TD3 Line 2 format: PASSPORT(9)CHECK(1)NATIONALITY(3)DOB(6)DOBCHECK(1)SEX(1)EXPIRY(6)EXPIRYCHECK(1)PERSONAL(14)PERSONALCHECK(1)FINALCHECK(1)
 */
function validateTD3CheckDigits(lines: string[]): Omit<MRZValidation, 'format' | 'overall'> {
  const line2 = lines[1];

  const passportNumber = line2.slice(0, 9);
  const passportCheckDigit = line2.slice(9, 10);
  const dateOfBirth = line2.slice(13, 19);
  const dobCheckDigit = line2.slice(19, 20);
  const dateOfExpiry = line2.slice(21, 27);
  const expiryCheckDigit = line2.slice(27, 28);
  // const personalNumber = line2.slice(28, 42); // Personal number (14 characters)
  // const personalCheckDigit = line2.slice(42, 43); // Personal number check digit

  // TD3 composite check: passport(9) + passportCheck(1) + dob(6) + dobCheck(1) + expiry(6) + expiryCheck(1) + personal(14) + personalCheck(1)
  const compositeField = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 28) + line2.slice(28, 43);
  const compositeCheckDigit = line2.slice(43, 44); // Last character of line 2

  return {
    passportNumberChecksum: verifyCheckDigit(passportNumber, passportCheckDigit),
    dateOfBirthChecksum: verifyCheckDigit(dateOfBirth, dobCheckDigit),
    dateOfExpiryChecksum: verifyCheckDigit(dateOfExpiry, expiryCheckDigit),
    compositeChecksum: verifyCheckDigit(compositeField, compositeCheckDigit),
  };
}

export function checkScannedInfo(passportNumber: string, dateOfBirth: string, dateOfExpiry: string): boolean {
  if (passportNumber.length > 9) {
    return false;
  }
  if (dateOfBirth.length !== 6) {
    return false;
  }
  if (dateOfExpiry.length !== 6) {
    return false;
  }
  return true;
}

/**
 * Extract and validate MRZ information from a machine-readable zone string
 * Supports TD3 format (passports) with comprehensive validation
 */
export function extractMRZInfo(mrzString: string): MRZInfo {
  if (!mrzString || typeof mrzString !== 'string') {
    throw new MrzParseError('MRZ string is required and must be a string');
  }

  const lines = mrzString
    .trim()
    .split('\n')
    .map(line => line.trim());

  // Validate format
  const isValidTD3 = validateTD3Format(lines);
  const isValidTD1 = validateTD1Format(lines);

  if (!isValidTD3 && !isValidTD1) {
    throw new MrzParseError(
      `Invalid MRZ format: Expected TD3 or TD1 format, got ${lines.length} lines with lengths [${lines.map(l => l.length).join(', ')}]`,
    );
  }

  let info: Omit<MRZInfo, 'validation'>;
  let checksums: Omit<MRZValidation, 'format' | 'overall'>;
  let validation: MRZValidation;

  if (isValidTD3) {
    // Extract basic information
    info = extractTD3Info(lines);
    checksums = validateTD3CheckDigits(lines);
    validation = {
      format: isValidTD3,
      ...checksums,
      overall: isValidTD3 && Object.values(checksums).every(Boolean),
    };
  } else {
    info = extractTD1Info(lines);
    checksums = validateTD1CheckDigits(lines);
    validation = {
      format: isValidTD1,
      ...checksums,
      overall: isValidTD1 && Object.values(checksums).every(Boolean),
    };
  }

  return {
    ...info,
    validation,
  };
}

/**
 * Extract name from MRZ string
 * Supports TD3 (passport) and TD1 (ID card) formats
 *
 * @param mrzString - The MRZ data as a string
 * @returns Object with firstName and lastName, or null if parsing fails
 *
 * @example
 * ```ts
 * const name = extractNameFromMRZ("P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<");
 * // Returns: { firstName: "JOHN", lastName: "DOE" }
 * ```
 */
export function extractNameFromMRZ(mrzString: string): { firstName: string; lastName: string } | null {
  if (!mrzString || typeof mrzString !== 'string') {
    return null;
  }

  let lines = mrzString
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  // Handle single-line MRZ strings (common for stored data)
  if (lines.length === 1) {
    const mrzLength = lines[0].length;

    // TD1 format (ID card): 90 characters = 3 lines × 30 chars
    // Detect TD1 by checking if it starts with 'I' (ID card) or 'A' (type A) or 'C' (type C)
    if (mrzLength === 90 && /^[IAC][<A-Z]/.test(lines[0])) {
      lines = [lines[0].slice(0, 30), lines[0].slice(30, 60), lines[0].slice(60, 90)];
    }
    // TD3 format (passport): 88 chars (2×44) or 90 chars (2×45)
    else if (mrzLength === 88 || mrzLength === 90) {
      const lineLength = mrzLength === 88 ? 44 : 45;
      lines = [lines[0].slice(0, lineLength), lines[0].slice(lineLength)];
    }
  }

  if (lines.length === 0) {
    return null;
  }

  // TD3 format (passport): Name is in line 1 after country code
  // Format: P<COUNTRY<<LASTNAME<<FIRSTNAME<<<<<<<<<<
  // TD3 typically has 2 lines, first line is usually 44 chars but we'll be lenient
  if (lines.length === 2) {
    const line1 = lines[0];
    const nameMatch = line1.match(/^[IPO]<[A-Z]{3}(.+)$/);

    if (nameMatch) {
      const namePart = nameMatch[1];
      // Split by << to separate last name and first name
      const parts = namePart.split('<<').filter(Boolean);

      if (parts.length >= 2) {
        const lastName = parts[0].replace(/<+$/, '').replace(/</g, ' ').trim();
        const firstName = parts[1].replace(/<+$/, '').replace(/</g, ' ').trim();
        return { firstName, lastName };
      } else if (parts.length === 1) {
        const name = parts[0].replace(/<+$/, '').replace(/</g, ' ').trim();
        return { firstName: '', lastName: name };
      }
    }
  }

  // TD1 format (ID card): Name is in line 3
  // Format: LASTNAME<<FIRSTNAME<<<<<<<<<<
  // TD1 typically has 3 lines, each 30 chars but we'll be lenient
  if (lines.length === 3) {
    const line3 = lines[2];
    const parts = line3.split('<<').filter(Boolean);

    if (parts.length >= 2) {
      const lastName = parts[0].replace(/<+$/, '').replace(/</g, ' ').trim();
      const firstName = parts[1].replace(/<+$/, '').replace(/</g, ' ').trim();
      return { firstName, lastName };
    } else if (parts.length === 1) {
      const name = parts[0].replace(/<+$/, '').replace(/</g, ' ').trim();
      return { firstName: '', lastName: name };
    }
  }

  return null;
}

/**
 * Format ISO date string (YYYY-MM-DD) to YYMMDD format
 * Handles timezone variations and validates input
 */
export function formatDateToYYMMDD(inputDate: string): string {
  if (!inputDate || typeof inputDate !== 'string') {
    throw new MrzParseError('Date string is required');
  }

  // Handle ISO date strings (YYYY-MM-DD format)
  const isoMatch = inputDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return year.slice(2) + month + day;
  }

  // Handle other common formats
  const dateMatch = inputDate.match(/^(\d{2,4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (dateMatch) {
    let [, year] = dateMatch;
    const [, , month, day] = dateMatch;

    // Handle 2-digit years (assume 20xx for 00-30, 19xx for 31-99)
    if (year.length === 2) {
      const yearNum = parseInt(year, 10);
      year = yearNum <= 30 ? `20${year}` : `19${year}`;
    }

    return year.slice(2) + month + day;
  }

  throw new MrzParseError(`Invalid date format: ${inputDate}. Expected ISO format (YYYY-MM-DD) or similar.`);
}
