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
      throw new Error(`Invalid character in MRZ: ${char}`);
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
 * Parse names from MRZ format (surname<<given<names<<<)
 * Handles complex cases like: VAN<<DER<<BERG<<MARIA<ELENA
 * Expected: surname="VAN  DER  BERG", givenNames="MARIA ELENA"
 */
function parseNames(nameField: string): { surname: string; givenNames: string } {
  const parts = nameField.split('<<');

  if (parts.length === 1) {
    // No '<<' found, entire field is surname
    return {
      surname: nameField.replace(/</g, ' ').trim(),
      givenNames: '',
    };
  }

  // Find the boundary between surname and given names
  // Look for the last part that contains '<' (indicating given names with spaces)
  let givenNamesStartIndex = parts.length; // Default to all surname

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // If a part contains '<' within it (not just trailing '<'), it's likely given names
    if (part.includes('<') && !part.endsWith('<'.repeat(part.length))) {
      givenNamesStartIndex = i;
      break;
    }
  }

  // If we didn't find a clear given names section, use the first << as boundary
  if (givenNamesStartIndex >= parts.length) {
    const firstDoubleSeparator = nameField.indexOf('<<');
    if (firstDoubleSeparator === -1) {
      return {
        surname: nameField.replace(/</g, ' ').trim(),
        givenNames: '',
      };
    }

    const surnameField = nameField.slice(0, firstDoubleSeparator);
    const givenNamesField = nameField.slice(firstDoubleSeparator + 2);

    return {
      surname: surnameField.replace(/</g, ' ').trim(),
      givenNames: givenNamesField.replace(/</g, ' ').trim(),
    };
  }

  // Build surname from parts before the given names (join with double spaces to reflect <<)
  const surnameParts = parts.slice(0, givenNamesStartIndex);
  const surname = surnameParts.join('  ').replace(/</g, ' ').trim();

  // Build given names from remaining parts
  const givenNamesParts = parts.slice(givenNamesStartIndex);
  const givenNames = givenNamesParts.join(' ').replace(/</g, ' ').trim();

  return { surname, givenNames };
}

/**
 * Validate TD3 MRZ format (passport/travel document)
 */
function validateTD3Format(lines: string[]): boolean {
  if (lines.length !== 2) {
    return false;
  }

  // TD3 format: 2 lines, 44 characters each
  return lines[0].length === 44 && lines[1].length === 44;
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
  const nameField = line1.slice(5, 44);
  const { surname, givenNames } = parseNames(nameField);

  // Line 2: PASSPORT(9)CHECK(1)NATIONALITY(3)DOB(6)DOBCHECK(1)SEX(1)EXPIRY(6)EXPIRYCHECK(1)OPTIONAL(7)FINALCHECK(1)
  const passportNumber = line2.slice(0, 9).replace(/</g, '');

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
  const sex = line2.slice(20, 21).replace(/</g, '');
  const dateOfExpiry = line2.slice(21, 27);

  return {
    documentType,
    issuingCountry,
    surname,
    givenNames,
    passportNumber,
    nationality,
    dateOfBirth,
    sex,
    dateOfExpiry,
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

/**
 * Extract and validate MRZ information from a machine-readable zone string
 * Supports TD3 format (passports) with comprehensive validation
 */
export function extractMRZInfo(mrzString: string): MRZInfo {
  if (!mrzString || typeof mrzString !== 'string') {
    throw new Error('MRZ string is required and must be a string');
  }

  const lines = mrzString
    .trim()
    .split('\n')
    .map(line => line.trim());

  // Validate format
  const isValidTD3 = validateTD3Format(lines);

  if (!isValidTD3) {
    throw new Error(
      `Invalid MRZ format: Expected TD3 format (2 lines × 44 characters), got ${lines.length} lines with lengths [${lines.map(l => l.length).join(', ')}]`,
    );
  }

  // Extract basic information
  const info = extractTD3Info(lines);

  // Validate check digits
  const checksums = validateTD3CheckDigits(lines);

  // Create validation result
  const validation: MRZValidation = {
    format: isValidTD3,
    ...checksums,
    overall: isValidTD3 && Object.values(checksums).every(Boolean),
  };

  return {
    ...info,
    validation,
  };
}

/**
 * Format ISO date string (YYYY-MM-DD) to YYMMDD format
 * Handles timezone variations and validates input
 */
export function formatDateToYYMMDD(inputDate: string): string {
  if (!inputDate || typeof inputDate !== 'string') {
    throw new Error('Date string is required');
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

  throw new Error(`Invalid date format: ${inputDate}. Expected ISO format (YYYY-MM-DD) or similar.`);
}
