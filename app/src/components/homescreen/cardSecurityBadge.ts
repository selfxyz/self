// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData, PassportData } from '@selfxyz/new-common';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/new-common';

export type SecurityLevel = 'HI-SECURITY' | 'LOW-SECURITY' | 'STANDARD';

/**
 * Determines security badge based on document type and NFC presence.
 * - KYC documents -> STANDARD (always)
 * - Aadhaar -> LOW-SECURITY (always, no NFC)
 * - MRZ documents (passport, ID card) -> HI-SECURITY if NFC, LOW-SECURITY otherwise
 *
 * NFC presence is determined by checking if dg2Hash exists and is not empty.
 * dg2Hash contains the facial image data which is only available via NFC read.
 */
export function getSecurityLevel(
  document: PassportData | AadhaarData,
): SecurityLevel {
  if (isAadhaarDocument(document)) {
    return 'LOW-SECURITY'; // Aadhaar never has NFC
  }

  if (isMRZDocument(document)) {
    // Check if document has NFC data (dg2Hash presence indicates NFC read)
    // dg2Hash contains facial image data which requires NFC to extract
    const hasNfc = Boolean(
      document.dg2Hash &&
      Array.isArray(document.dg2Hash) &&
      document.dg2Hash.length > 0,
    );
    return hasNfc ? 'HI-SECURITY' : 'LOW-SECURITY';
  }

  return 'LOW-SECURITY'; // Fallback
}
