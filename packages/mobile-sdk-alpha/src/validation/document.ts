import { hash } from '@selfxyz/common/utils/hash/sha';
import { formatMrz } from '@selfxyz/common/utils/passportFormat';

import type { PassportData } from '../types/public';

/**
 * Checks if two numeric arrays contain the same values in the same order.
 * @internal
 */
function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const SUPPORTED_HASH_FUNCTIONS = ['sha256', 'sha384', 'sha512'] as const;

/**
 * Callbacks fired for specific passport validation failures.
 */
export interface PassportValidationCallbacks {
  /** No passport data was supplied. */
  onPassportDataNull?: () => void;
  /** Passport data lacked required metadata. */
  onPassportMetadataNull?: (data: PassportData) => void;
  /** DG1 hash function was missing from metadata. */
  onDg1HashFunctionNull?: (data: PassportData) => void;
  /** EContent hash function was missing from metadata. */
  onEContentHashFunctionNull?: (data: PassportData) => void;
  /** Signed attribute hash function was missing from metadata. */
  onSignedAttrHashFunctionNull?: (data: PassportData) => void;
  /** Calculated DG1 hash didn't match the supplied value. */
  onDg1HashMismatch?: (data: PassportData) => void;
}

/**
 * Validates passport data by ensuring required metadata and hash values match.
 * Invokes per-error callbacks when validation fails.
 *
 * @param passportData - Parsed passport data to validate.
 * @param callbacks - Optional hooks for tracking validation errors.
 * @returns Whether the passport data passed all validation checks.
 */
export function isPassportDataValid(
  passportData: PassportData | undefined,
  callbacks: PassportValidationCallbacks = {},
): boolean {
  const {
    onPassportDataNull,
    onPassportMetadataNull,
    onDg1HashFunctionNull,
    onEContentHashFunctionNull,
    onSignedAttrHashFunctionNull,
    onDg1HashMismatch,
  } = callbacks;

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

  const dg1Algo = dg1HashFunction.toLowerCase() as (typeof SUPPORTED_HASH_FUNCTIONS)[number];
  const eContentAlgo = eContentHashFunction.toLowerCase() as (typeof SUPPORTED_HASH_FUNCTIONS)[number];
  const signedAttrAlgo = signedAttrHashFunction.toLowerCase() as (typeof SUPPORTED_HASH_FUNCTIONS)[number];
  if (
    !SUPPORTED_HASH_FUNCTIONS.includes(dg1Algo) ||
    !SUPPORTED_HASH_FUNCTIONS.includes(eContentAlgo) ||
    !SUPPORTED_HASH_FUNCTIONS.includes(signedAttrAlgo)
  ) {
    return false;
  }

  if (!passportData.mrz) {
    return false;
  }

  if (passportData.dg1Hash && passportData.dg1Hash.length > 0) {
    const hashResult = hash(dg1Algo, formatMrz(passportData.mrz));
    if (!Array.isArray(hashResult) || !hashResult.every(n => typeof n === 'number' && Number.isFinite(n))) {
      return false;
    }
    const expected = hashResult as number[];
    if (!arraysEqual(passportData.dg1Hash, expected)) {
      onDg1HashMismatch?.(passportData);
      return false;
    }
  }

  return true;
}
