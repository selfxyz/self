// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDDocument } from '@selfxyz/common/utils/types';

/**
 * Maps a `DocumentMetadata.documentCategory` ("passport" / "id_card" / "aadhaar")
 * to the short id-type code used by the perks catalogue ("p" / "i" / "a").
 * Returns null for categories with no perk mapping (e.g. kyc).
 */
export function idTypeForDocumentCategory(
  category: IDDocument['documentCategory'],
): string | null {
  switch (category) {
    case 'passport':
      return 'p';
    case 'id_card':
      return 'i';
    case 'aadhaar':
      return 'a';
    default:
      return null;
  }
}

/**
 * Gets the document type display name for the proof request message.
 * For KYC documents, pass idType to display the specific document type (e.g. "Passport", "Driver's Licence").
 */
export function getDocumentTypeName(
  category: string | undefined,
  idType?: string,
): string {
  switch (category) {
    case 'passport':
      return 'Passport';
    case 'id_card':
      return 'ID Card';
    case 'aadhaar':
      return 'Aadhaar';
    case 'kyc':
      return idType || 'Verified ID';
    default:
      return 'Document';
  }
}
