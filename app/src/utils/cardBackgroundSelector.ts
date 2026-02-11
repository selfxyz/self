// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDDocument } from '@selfxyz/common';
import {
  deserializeApplicantInfo,
  isAadhaarDocument,
  isKycDocument,
  isMRZDocument,
} from '@selfxyz/common';

const BACKGROUND_COUNT = 6;

/**
 * Get a deterministic background index (1-6) based on document data.
 * Uses a simple polynomial rolling hash of unique document identifiers.
 * The same document will always return the same background index.
 */
export function getBackgroundIndex(document: IDDocument): number {
  let hashInput: string;

  if (isMRZDocument(document)) {
    // For passport/ID card: use MRZ string
    hashInput = document.mrz;
  } else if (isAadhaarDocument(document)) {
    // For Aadhaar: use last 4 digits + name + dob
    const fields = document.extractedFields;
    hashInput = `${fields?.aadhaarLast4Digits}|${fields?.name}|${fields?.dob}`;
  } else if (isKycDocument(document)) {
    // For KYC: deserialize applicant info and use idNumber + fullName + dob
    try {
      const applicantInfo = deserializeApplicantInfo(
        document.serializedApplicantInfo,
      );
      hashInput = `${applicantInfo.idNumber}|${applicantInfo.fullName}|${applicantInfo.dob}`;
    } catch {
      hashInput = document.serializedApplicantInfo ?? '';
    }
  } else {
    // Fallback for unknown document types
    hashInput = '';
  }

  // Polynomial rolling hash (multiplier 31) for even distribution
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash * 31 + hashInput.charCodeAt(i)) >>> 0;
  }

  return (hash % BACKGROUND_COUNT) + 1; // Returns 1-6
}
