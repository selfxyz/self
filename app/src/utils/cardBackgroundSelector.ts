// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData, KycData, PassportData } from '@selfxyz/common';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common';

const BACKGROUND_COUNT = 6;

/**
 * Get a deterministic background index (1-6) based on document data.
 * Uses a simple polynomial rolling hash of unique document identifiers.
 * The same document will always return the same background index.
 */
export function getBackgroundIndex(
  document: PassportData | AadhaarData | KycData,
): number {
  let hashInput: string;

  if (isMRZDocument(document as PassportData | AadhaarData)) {
    // For passport/ID card: use MRZ string
    hashInput = (document as PassportData).mrz;
  } else if (isAadhaarDocument(document as PassportData | AadhaarData)) {
    // For Aadhaar: use last 4 digits + name + dob
    const aadhaar = document as AadhaarData;
    const fields = aadhaar.extractedFields;
    hashInput = `${fields?.aadhaarLast4Digits}|${fields?.name}|${fields?.dob}`;
  } else {
    // For KYC: use idNumber + fullName + dob
    const kyc = document as KycData;
    hashInput = `${kyc.idNumber}|${kyc.fullName}|${kyc.dob}`;
  }

  // Polynomial rolling hash (multiplier 31) for even distribution
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    hash = (hash * 31 + hashInput.charCodeAt(i)) >>> 0;
  }

  return (hash % BACKGROUND_COUNT) + 1; // Returns 1-6
}
