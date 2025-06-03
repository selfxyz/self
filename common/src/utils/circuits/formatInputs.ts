import { MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH } from '../../constants/constants.js';
// import { commonNames } from '../../constants/countries.js';

/**
 * Formats the list of country codes for use in verification circuits.
 * Important: this list must exactly match the list in the backend.
 *
 * @param countries Array of three-letter country codes
 * @returns Formatted byte array representing country codes
 * @throws Error if the maximum list length is exceeded or if country codes are invalid
 */
export function formatCountriesList(countries: string[]) {
  // Check maximum list length
  if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }

  // Validate country codes
  for (const country of countries) {
    if (!country || country.length !== 3) {
      throw new Error(
        `Invalid country code: "${country}". Country codes must be exactly 3 characters long.`
      );
    }

    // Optional check for the country code existence in the list of valid codes
    // This code can be uncommented if strict validation of country codes is needed
    /*
        const isValidCountry = Object.values(commonNames).some(
            name => name === country || country in commonNames
        );

        if (!isValidCountry) {
            throw new Error(`Unknown country code: "${country}". Please use valid 3-letter ISO country codes.`);
        }
        */
  }

  const paddedCountries = countries.concat(
    Array(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH - countries.length).fill('')
  );
  const result = paddedCountries.flatMap((country) => {
    const chars = country
      .padEnd(3, '\0')
      .split('')
      .map((char) => char.charCodeAt(0));
    return chars;
  });
  return result;
}

export function reverseBytes(input: string): string {
  const hex = input.slice(2);

  const bytes = hex.match(/.{2}/g) || [];

  const reversedBytes = bytes.reverse();

  return '0x' + reversedBytes.join('');
}

export function reverseCountryBytes(input: string): string {
  const hex = input.slice(2);
  const groups = hex.match(/.{6}/g) || [];
  const reversedGroups = groups.reverse();

  const remainderLength = hex.length % 6;
  let remainder = '';
  if (remainderLength > 0) {
    remainder = hex.slice(hex.length - remainderLength);
  }

  return '0x' + reversedGroups.join('') + remainder;
}
