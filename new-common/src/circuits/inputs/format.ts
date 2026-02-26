import { MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH } from '../../foundation/constants/disclosure.js';

export function formatInput(input: any) {
  if (Array.isArray(input)) {
    return input.map((item) => BigInt(item).toString());
  } else if (input instanceof Uint8Array) {
    return Array.from(input).map((num) => BigInt(num).toString());
  } else if (typeof input === 'string' && input.includes(',')) {
    const numbers = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '' && !isNaN(Number(s)))
      .map(Number);
    return numbers.map((num) => BigInt(num).toString());
  } else {
    return [BigInt(input).toString()];
  }
}

export function formatCountriesList(countries: string[]) {
  if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }

  for (const country of countries) {
    if (!country || country.length !== 3) {
      throw new Error(
        `Invalid country code: "${country}". Country codes must be exactly 3 characters long.`
      );
    }
  }

  const paddedCountries = countries.concat(
    Array(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH - countries.length).fill('')
  );
  return paddedCountries.flatMap((country) =>
    country
      .padEnd(3, '\0')
      .split('')
      .map((char) => char.charCodeAt(0))
  );
}

export function reverseBytes(input: string): string {
  const hex = input.slice(2);
  const bytes = hex.match(/.{2}/g) || [];
  return '0x' + bytes.reverse().join('');
}

export function reverseCountryBytes(input: string): string {
  const hex = input.slice(2);
  const groups = hex.match(/.{6}/g) || [];
  const reversedGroups = groups.reverse();
  const remainderLength = hex.length % 6;
  const remainder = remainderLength > 0 ? hex.slice(hex.length - remainderLength) : '';
  return '0x' + reversedGroups.join('') + remainder;
}
