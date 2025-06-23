import { unpackReveal } from '@selfxyz/common/utils/circuits/formatOutputs';

function trimu0000(unpackedReveal: string[]): string[] {
  return unpackedReveal.filter((value) => value !== '\u0000');
}

/**
 * Unpacks a list of packed forbidden country codes into an array of 3-character country codes.
 *
 * @param forbiddenCountriesList_packed - An array of packed strings representing forbidden countries.
 * @returns An array of 3-character country codes extracted from the packed input.
 */
export function unpackForbiddenCountriesList(forbiddenCountriesList_packed: string[]) {
  const trimmed = trimu0000(unpackReveal(forbiddenCountriesList_packed, 'id'));
  const countries = [];
  for (let i = 0; i < trimmed.length; i += 3) {
    const countryCode = trimmed.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      countries.push(countryCode);
    }
  }
  return countries;
}
