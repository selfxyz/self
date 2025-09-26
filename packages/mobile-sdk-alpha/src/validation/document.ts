// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common';
import { formatMrz, hash } from '@selfxyz/common';

/**
 * Checks if two numeric arrays contain the same values in the same order.
 * @internal
 */
function arraysEqual(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const SUPPORTED_HASH_FUNCTIONS = ['sha256', 'sha384', 'sha512'] as const;

type SupportedHash = (typeof SUPPORTED_HASH_FUNCTIONS)[number];

function isSupportedHashAlgorithm(x: string): x is SupportedHash {
  return (SUPPORTED_HASH_FUNCTIONS as readonly string[]).includes(x);
}

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
  /** An unsupported hash algorithm was supplied in metadata. */
  onUnsupportedHashAlgorithm?: (field: 'dg1' | 'eContent' | 'signedAttr', value: string, data: PassportData) => void;
  /** DG1 hash missing or empty; nothing to validate against. */
  onDg1HashMissing?: (data: PassportData) => void;
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
    onUnsupportedHashAlgorithm,
    onDg1HashMissing,
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

  const dg1Algo = dg1HashFunction.toLowerCase();
  const eContentAlgo = eContentHashFunction.toLowerCase();
  const signedAttrAlgo = signedAttrHashFunction.toLowerCase();

  if (!isSupportedHashAlgorithm(dg1Algo)) {
    onUnsupportedHashAlgorithm?.('dg1', dg1Algo, passportData);
    return false;
  }
  if (!isSupportedHashAlgorithm(eContentAlgo)) {
    onUnsupportedHashAlgorithm?.('eContent', eContentAlgo, passportData);
    return false;
  }
  if (!isSupportedHashAlgorithm(signedAttrAlgo)) {
    onUnsupportedHashAlgorithm?.('signedAttr', signedAttrAlgo, passportData);
    return false;
  }

  if (!passportData.mrz) {
    return false;
  }

  if (passportData.dg1Hash && passportData.dg1Hash.length > 0) {
    try {
      const hashResult = hash(dg1Algo, formatMrz(passportData.mrz));
      if (!Array.isArray(hashResult) || !hashResult.every(n => typeof n === 'number' && Number.isFinite(n))) {
        return false;
      }
      const expected = hashResult as number[];
      if (!arraysEqual(passportData.dg1Hash, expected)) {
        onDg1HashMismatch?.(passportData);
        return false;
      }
    } catch (e) {
      // Log the error or handle it appropriately
      console.error('Error calculating DG1 hash:', e);
      return false;
    }
  } else {
    onDg1HashMissing?.(passportData);
  }

  return true;
}
