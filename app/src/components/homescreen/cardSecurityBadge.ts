// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData } from '@selfxyz/common';
import type { PassportData } from '@selfxyz/common/types/passport';
import { isAadhaarDocument, isMRZDocument } from '@selfxyz/common/utils/types';

export type SecurityLevel = 'HI-SECURITY' | 'LOW-SECURITY' | 'STANDARD';

export interface SecurityLevelOptions {
  /** Mock/dev documents never reach HI-SECURITY regardless of dg2Hash presence. */
  mock?: boolean;
}

export function getSecurityBadgeLabel(
  document: PassportData | AadhaarData,
  options: SecurityLevelOptions = {},
): string {
  if (isAadhaarDocument(document)) {
    return 'QR verified';
  }

  if (isMRZDocument(document)) {
    return getSecurityLevel(document, options) === 'HI-SECURITY'
      ? 'NFC verified'
      : 'MRZ verified';
  }

  return 'Document verified';
}

/**
 * Determines security badge based on document type and NFC presence.
 * - Mock documents -> LOW-SECURITY (always, regardless of populated NFC fields)
 * - Aadhaar -> LOW-SECURITY (always, no NFC)
 * - MRZ documents (passport, ID card) -> HI-SECURITY if NFC, LOW-SECURITY otherwise
 *
 * NFC presence is determined by checking if dg2Hash exists and is not empty.
 * dg2Hash contains the facial image data which is only available via NFC read.
 */
export function getSecurityLevel(
  document: PassportData | AadhaarData,
  options: SecurityLevelOptions = {},
): SecurityLevel {
  if (options.mock) {
    return 'LOW-SECURITY';
  }

  if (isAadhaarDocument(document)) {
    return 'LOW-SECURITY'; // Aadhaar never has NFC
  }

  if (isMRZDocument(document)) {
    const hasNfc = Boolean(
      document.dg2Hash &&
      Array.isArray(document.dg2Hash) &&
      document.dg2Hash.length > 0,
    );
    return hasNfc ? 'HI-SECURITY' : 'LOW-SECURITY';
  }

  return 'LOW-SECURITY';
}
