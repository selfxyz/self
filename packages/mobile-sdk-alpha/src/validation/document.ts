import { hash } from '@selfxyz/common/utils/hash/sha';
import { formatMrz } from '@selfxyz/common/utils/passportFormat';

import type { PassportData } from '../types/public';

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface PassportValidationCallbacks {
  onPassportDataNull?: () => void;
  onPassportMetadataNull?: (data: PassportData) => void;
  onDg1HashFunctionNull?: (data: PassportData) => void;
  onEContentHashFunctionNull?: (data: PassportData) => void;
  onSignedAttrHashFunctionNull?: (data: PassportData) => void;
  onDg1HashMismatch?: (data: PassportData) => void;
}

export function isPassportDataValid(
  passportData: PassportData | undefined,
  opts: PassportValidationCallbacks = {},
): boolean {
  const {
    onPassportDataNull,
    onPassportMetadataNull,
    onDg1HashFunctionNull,
    onEContentHashFunctionNull,
    onSignedAttrHashFunctionNull,
    onDg1HashMismatch,
  } = opts;

  if (!passportData) {
    onPassportDataNull?.();
    return false;
  }

  const { passportMetadata } = passportData;
  if (!passportMetadata) {
    onPassportMetadataNull?.(passportData);
    return false;
  }

  const { dg1HashFunction, eContentHashFunction, signedAttrHashFunction } = passportMetadata;
  if (!dg1HashFunction) {
    onDg1HashFunctionNull?.(passportData);
    return false;
  }
  if (!eContentHashFunction) {
    onEContentHashFunctionNull?.(passportData);
    return false;
  }
  if (!signedAttrHashFunction) {
    onSignedAttrHashFunctionNull?.(passportData);
    return false;
  }

  if (passportData.dg1Hash) {
    const expected = hash(dg1HashFunction, formatMrz(passportData.mrz)) as number[];
    if (!arraysEqual(passportData.dg1Hash, expected)) {
      onDg1HashMismatch?.(passportData);
      return false;
    }
  }

  return true;
}
