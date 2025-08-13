import { hash } from '@selfxyz/common/utils/hash/sha';
import { formatMrz } from '@selfxyz/common/utils/passportFormat';

import type { PassportData } from '../types/public';

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function isPassportDataValid(passportData: PassportData): boolean {
  if (!passportData || !passportData.passportMetadata) return false;
  const { dg1HashFunction, eContentHashFunction, signedAttrHashFunction } = passportData.passportMetadata;
  if (!dg1HashFunction || !eContentHashFunction || !signedAttrHashFunction) return false;

  if (passportData.dg1Hash) {
    const expected = hash(dg1HashFunction, formatMrz(passportData.mrz)) as number[];
    if (!arraysEqual(passportData.dg1Hash, expected)) return false;
  }

  return true;
}
