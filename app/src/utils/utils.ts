// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

export function checkScannedInfo(
  passportNumber: string,
  dateOfBirth: string,
  dateOfExpiry: string,
): boolean {
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

// Handles both TD1 (3 lines, 30 chars each) and TD3 (2 lines, 44 chars each) formats
export function extractMRZInfo(mrzString: string) {
  const mrzLines = mrzString.split('\n');

  //line 1 and line 2 - concated
  const TD1_REGEX =
    /^(?<documentType>[A-Z0-9<]{2})(?<issuingCountry>[A-Z<]{3})(?<documentNumber>[A-Z0-9<]{9})(?<checkDigitDocumentNumber>[0-9]{1})(?<optionalData1>[A-Z0-9<]{15})(?<dateOfBirth>[0-9]{6})(?<checkDigitDateOfBirth>[0-9]{1})(?<sex>[MF<]{1})(?<dateOfExpiry>[0-9]{6})(?<checkDigitDateOfExpiry>[0-9]{1})(?<nationality>[A-Z<]{3})(?<optionalData2>[A-Z0-9<]{7})/;
  const TD3_line_2_REGEX = /^([A-Z0-9<]{9})([0-9ILDSOG])([A-Z<]{3})/;

  const isTD1 = TD1_REGEX.test(mrzLines[0]) || mrzLines[0].startsWith('I');
  const isTD3 = TD3_line_2_REGEX.test(mrzLines[1]);

  if (!isTD1 && !isTD3) {
    throw new Error(
      'Invalid MRZ format: Line length must be 30 (TD1) or 44 (TD3) characters',
    );
  }

  let passportNumber, dateOfBirth, dateOfExpiry, documentType, countryCode;

  if (isTD1) {
    // TD1 format (ID cards)
    const line = mrzLines[0];
    documentType = line.slice(0, 2).replace(/</g, '').trim();
    countryCode = line.slice(2, 5).replace(/</g, '').trim();
    passportNumber = line.slice(5, 14).replace(/</g, '').trim();
    dateOfBirth = line.slice(30, 36).trim();
    dateOfExpiry = line.slice(38, 44).trim();
  } else {
    // TD3 format (passports)
    documentType = mrzLines[0].slice(0, 2).replace(/</g, '').trim();
    countryCode = mrzLines[0].slice(2, 5).replace(/</g, '').trim();
    passportNumber = mrzLines[1].slice(0, 9).replace(/</g, '').trim();
    dateOfBirth = mrzLines[1].slice(13, 19).trim();
    dateOfExpiry = mrzLines[1].slice(21, 27).trim();
  }

  return {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    documentType,
    countryCode,
  };
}

// Function to format date from 'YYYY-MM-DD 00:00:00 +0000' to 'YYMMDD'
export function formatDateToYYMMDD(inputDate: string) {
  // Extract the date components directly from the input string
  const year = inputDate.substring(2, 4); // Get YY part
  const month = inputDate.substring(5, 7); // Get MM part
  const day = inputDate.substring(8, 10); // Get DD part

  // Concatenate components into YYMMDD format
  return year + month + day;
}
