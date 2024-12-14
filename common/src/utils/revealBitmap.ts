import { attributeToPosition } from '../constants/constants';
import { DisclosureOptions } from './appType';

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
export function revealBitmapFromAttributes(disclosureOptions: DisclosureOptions): string[] {
  const reveal_bitmap = Array(88).fill('0');

  Object.entries(disclosureOptions).forEach(([attribute, { enabled }]) => {
    if (enabled && attribute in attributeToPosition) {
      const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
      reveal_bitmap.fill('1', start, end + 1);
    }
  });

  return reveal_bitmap;
}

export function unpackReveal(revealedData_packed: string | string[]): string[] {
  // If revealedData_packed is not an array, convert it to an array
  const packedArray = Array.isArray(revealedData_packed)
    ? revealedData_packed
    : [revealedData_packed];

  const bytesCount = [31, 31, 28]; // nb of bytes in each of the first three field elements
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

export function formatAndUnpackReveal(revealedData_packed: string[]): string[] {
  const revealedData_packed_formatted = [
    revealedData_packed['revealedData_packed[0]'],
    revealedData_packed['revealedData_packed[1]'],
    revealedData_packed['revealedData_packed[2]'],
  ];
  return unpackReveal(revealedData_packed_formatted);
}

export function formatAndUnpackForbiddenCountriesList(
  forbiddenCountriesList_packed: string[]
): string[] {
  const forbiddenCountriesList_packed_formatted = [
    forbiddenCountriesList_packed['forbidden_countries_list_packed[0]'],
    forbiddenCountriesList_packed['forbidden_countries_list_packed[1]'],
  ];
  return unpackReveal(forbiddenCountriesList_packed_formatted);
}
