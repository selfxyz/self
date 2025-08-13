import { hash } from '@selfxyz/common/utils/hash/sha';
import { formatMrz } from '@selfxyz/common/utils/passportFormat';

import type { PassportData } from '../types/public';

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export type PassportValidationError =
  | 'passport_data_null'
  | 'passport_metadata_null'
  | 'dg1_hash_function_null'
  | 'econtent_hash_function_null'
  | 'signed_attr_hash_function_null'
  | 'dg1_hash_mismatch';

export interface PassportValidationOptions {
  onInvalid?: (error: PassportValidationError, data?: PassportData) => void;
}

export function isPassportDataValid(
  passportData: PassportData | undefined,
  opts: PassportValidationOptions = {},
): boolean {
  const { onInvalid } = opts;

  if (!passportData) {
    onInvalid?.('passport_data_null');
    return false;
  }

  const { passportMetadata } = passportData;
  if (!passportMetadata) {
    onInvalid?.('passport_metadata_null', passportData);
    return false;
  }

  const { dg1HashFunction, eContentHashFunction, signedAttrHashFunction } = passportMetadata;
  if (!dg1HashFunction) {
    onInvalid?.('dg1_hash_function_null', passportData);
    return false;
  }
  if (!eContentHashFunction) {
    onInvalid?.('econtent_hash_function_null', passportData);
    return false;
  }
  if (!signedAttrHashFunction) {
    onInvalid?.('signed_attr_hash_function_null', passportData);
    return false;
  }

  if (passportData.dg1Hash) {
    const expected = hash(dg1HashFunction, formatMrz(passportData.mrz)) as number[];
    if (!arraysEqual(passportData.dg1Hash, expected)) {
      onInvalid?.('dg1_hash_mismatch', passportData);
      return false;
    }
  }

  return true;
}
