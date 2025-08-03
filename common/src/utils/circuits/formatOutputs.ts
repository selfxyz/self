import { attributeToPosition, attributeToPosition_ID } from '../../constants/constants.js';
import type { SelfAppDisclosureConfig } from '../appType.js';

export function formatAndUnpackForbiddenCountriesList(
  forbiddenCountriesList_packed: string[]
): string[] {
  const forbiddenCountriesList_packed_formatted = [
    forbiddenCountriesList_packed['forbidden_countries_list_packed[0]'],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[1]'],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[2]'],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[3]'],
  ];
  const trimmed = trimu0000(unpackReveal(forbiddenCountriesList_packed_formatted, 'id'));
  const countries: string[] = [];
  for (let i = 0; i < trimmed.length; i += 3) {
    const countryCode = trimmed.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      countries.push(countryCode);
    }
  }
  return countries; // Return countries array instead of trimmed
}

/*** Disclose circuits ***/

function trimu0000(unpackedReveal: string[]): string[] {
  return unpackedReveal.filter((value) => value !== '\u0000');
}

export function formatAndUnpackReveal(
  revealedData_packed: string[],
  id_type: 'passport' | 'id'
): string[] {
  const revealedData_packed_formatted_passport = [
    revealedData_packed['revealedData_packed[0]'],
    revealedData_packed['revealedData_packed[1]'],
    revealedData_packed['revealedData_packed[2]'],
  ];
  const revealedData_packed_formatted_id = [
    revealedData_packed['revealedData_packed[0]'],
    revealedData_packed['revealedData_packed[1]'],
    revealedData_packed['revealedData_packed[2]'],
    revealedData_packed['revealedData_packed[3]'],
  ];
  return unpackReveal(
    id_type === 'passport'
      ? revealedData_packed_formatted_passport
      : revealedData_packed_formatted_id,
    id_type
  );
}

/*** OpenPassport Attestation ***/
export function formatForbiddenCountriesListFromCircuitOutput(
  forbiddenCountriesList: string
): string[] {
  const countryList1 = unpackReveal(forbiddenCountriesList, 'id');
  // dump every '\x00' value from the list
  const cleanedCountryList = countryList1.filter((value) => value !== '\x00');
  // Concatenate every 3 elements to form country codes
  const formattedCountryList = [];
  for (let i = 0; i < cleanedCountryList.length; i += 3) {
    const countryCode = cleanedCountryList.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      formattedCountryList.push(countryCode);
    }
  }
  return formattedCountryList;
}

export function getAttributeFromUnpackedReveal(
  unpackedReveal: string[],
  attribute: string,
  id_type: 'passport' | 'id'
) {
  const position =
    id_type === 'passport' ? attributeToPosition[attribute] : attributeToPosition_ID[attribute];
  let attributeValue = '';
  for (let i = position[0]; i <= position[1]; i++) {
    if (unpackedReveal[i] !== '\u0000') {
      attributeValue += unpackedReveal[i];
    }
  }
  return attributeValue;
}

export function getOlderThanFromCircuitOutput(olderThan: string[]): number {
  const ageString = olderThan.map((code) => String.fromCharCode(parseInt(code))).join('');
  const age = parseInt(ageString, 10);
  return isNaN(age) ? 0 : age;
}

export function revealBitmapFromAttributes(
  disclosureOptions: SelfAppDisclosureConfig,
  id_type: 'passport' | 'id'
): string[] {
  const reveal_bitmap = Array(id_type === 'passport' ? 88 : 90).fill('0');
  const att_to_position = id_type === 'passport' ? attributeToPosition : attributeToPosition_ID;
  Object.entries(disclosureOptions).forEach(([attribute, { enabled }]) => {
    if (enabled && attribute in att_to_position) {
      const [start, end] = att_to_position[attribute as keyof typeof att_to_position];
      reveal_bitmap.fill('1', start, end + 1);
    }
  });

  return reveal_bitmap;
}

export function revealBitmapFromMapping(attributeToReveal: { [key: string]: string }): string[] {
  const reveal_bitmap = Array(90).fill('0');

  Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
    if (reveal !== '') {
      const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
      reveal_bitmap.fill('1', start, end + 1);
    }
  });

  return reveal_bitmap;
}
export function unpackReveal(
  revealedData_packed: string | string[],
  id_type: 'passport' | 'id'
): string[] {
  // If revealedData_packed is not an array, convert it to an array
  const packedArray = Array.isArray(revealedData_packed)
    ? revealedData_packed
    : [revealedData_packed];

  const bytesCount = id_type === 'passport' ? [31, 31, 31] : [31, 31, 31, 31]; // nb of bytes in each of the first three field elements
  const bytesArray = packedArray.flatMap((element: string, index: number) => {
    const bytes = bytesCount[index] || 31; // Use 31 as default if index is out of range
    const elementBigInt = BigInt(element);
    const byteMask = BigInt(255); // 0xFF
    const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
      return (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask;
    });
    return bytesOfElement;
  });

  return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
}
