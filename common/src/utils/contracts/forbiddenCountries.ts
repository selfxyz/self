import { MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH } from '../../constants/constants.js';
import type { Country3LetterCode } from '../../constants/countries.js';

export function getPackedForbiddenCountries(
  forbiddenCountriesList: Array<Country3LetterCode | ''>
): string[] {
  if (forbiddenCountriesList.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be less than or equal to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }

  // Step 1: Pad the list to the maximum length
  const paddedCountries = [...forbiddenCountriesList];
  while (paddedCountries.length < MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    paddedCountries.push('');
  }

  // Step 2: Convert each country to its character codes
  const countryBytes: number[] = [];
  for (const country of paddedCountries) {
    const paddedCountry = country.padEnd(3, '\0');
    for (const char of paddedCountry) {
      countryBytes.push(char.charCodeAt(0));
    }
  }

  // Step 3: Convert to hex string and reverse bytes
  let hexString = '0x';
  for (let i = 0; i < countryBytes.length; i++) {
    hexString += countryBytes[i].toString(16).padStart(2, '0');
  }

  // Step 4: Reverse the bytes (2 characters per byte)
  const hex = hexString.slice(2);
  const bytes = hex.match(/.{2}/g) || [];
  const reversedBytes = bytes.reverse();
  const reversedHex = '0x' + reversedBytes.join('');

  // Step 5: Split into chunks of 31 bytes (62 hex chars) from the back
  const result: string[] = [];
  let remaining = reversedHex.slice(2); // Remove '0x'
  const chunkSizeHex = 31 * 2; // 31 bytes = 62 hex chars

  while (remaining.length > 0) {
    const chunk = remaining.slice(-chunkSizeHex);
    remaining = remaining.slice(0, -chunkSizeHex);

    const paddedChunk = chunk.padStart(64, '0');
    result.push('0x' + paddedChunk);
  }

  return result;
}
