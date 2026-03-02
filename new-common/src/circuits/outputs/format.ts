import { MAX_BYTES_IN_FIELD } from '../../foundation/constants/crypto.js';
import {
  attributeToPosition,
  attributeToPosition_ID,
} from '../../foundation/constants/disclosure.js';
import type { SelfAppDisclosureConfig } from '../../foundation/types/app.js';

function trimu0000(unpackedReveal: string[]): string[] {
  return unpackedReveal.filter(value => value !== '\u0000');
}

export function unpackReveal(revealedData_packed: string | string[]): string[] {
  const packedArray = Array.isArray(revealedData_packed)
    ? revealedData_packed
    : [revealedData_packed];

  const bytesArray = packedArray.flatMap((element: string) => {
    const elementBigInt = BigInt(element);
    const byteMask = BigInt(255);
    return [...Array(MAX_BYTES_IN_FIELD)].map(
      (_, byteIndex) => (elementBigInt >> (BigInt(byteIndex) * BigInt(8))) & byteMask,
    );
  });

  return bytesArray.map((byte: bigint) => String.fromCharCode(Number(byte)));
}

export function formatAndUnpackForbiddenCountriesList(
  forbiddenCountriesList_packed: string[],
): string[] {
  const formatted = [
    forbiddenCountriesList_packed['forbidden_countries_list_packed[0]' as any],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[1]' as any],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[2]' as any],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[3]' as any],
  ];
  const trimmed = trimu0000(unpackReveal(formatted));
  const countries: string[] = [];
  for (let i = 0; i < trimmed.length; i += 3) {
    const countryCode = trimmed.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      countries.push(countryCode);
    }
  }
  return countries;
}

export function formatAndUnpackReveal(
  revealedData_packed: string[],
  id_type: 'passport' | 'id',
): string[] {
  const formatted_passport = [
    revealedData_packed['revealedData_packed[0]' as any],
    revealedData_packed['revealedData_packed[1]' as any],
    revealedData_packed['revealedData_packed[2]' as any],
  ];
  const formatted_id = [
    revealedData_packed['revealedData_packed[0]' as any],
    revealedData_packed['revealedData_packed[1]' as any],
    revealedData_packed['revealedData_packed[2]' as any],
    revealedData_packed['revealedData_packed[3]' as any],
  ];
  return unpackReveal(id_type === 'passport' ? formatted_passport : formatted_id);
}

export function formatForbiddenCountriesListFromCircuitOutput(
  forbiddenCountriesList: string,
): string[] {
  const countryList = unpackReveal(forbiddenCountriesList);
  const cleaned = countryList.filter(value => value !== '\x00');
  const formatted: string[] = [];
  for (let i = 0; i < cleaned.length; i += 3) {
    const countryCode = cleaned.slice(i, i + 3).join('');
    if (countryCode.length === 3) {
      formatted.push(countryCode);
    }
  }
  return formatted;
}

export function getAttributeFromUnpackedReveal(
  unpackedReveal: string[],
  attribute: string,
  id_type: 'passport' | 'id',
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
  const ageString = olderThan.map(code => String.fromCharCode(parseInt(code))).join('');
  const age = parseInt(ageString, 10);
  return isNaN(age) ? 0 : age;
}

export function revealBitmapFromAttributes(
  disclosureOptions: SelfAppDisclosureConfig,
  id_type: 'passport' | 'id',
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
