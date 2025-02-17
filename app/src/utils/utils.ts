// The actual parsing would depend on the standard being used (TD1, TD2, TD3, MRVA, MRVB).
export function extractMRZInfo(mrzString: string) {
  const mrzLines = mrzString.split('\n');

  if (mrzLines.length < 2) {
    throw new Error('Invalid MRZ format: Expected two lines of MRZ data');
  }

  let passportNumber = mrzLines[1].slice(0, 9).replace(/</g, '').trim();
  const dateOfBirth = mrzLines[1].slice(13, 19).trim();
  const dateOfExpiry = mrzLines[1].slice(21, 27).trim();

  return {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
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
