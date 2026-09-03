// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory } from '@selfxyz/common/types';
import type { AlternativeCSCA } from '@selfxyz/common/utils/passports/validate';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';

/**
 * Helper function to get alternative CSCA or public keys for a document category.
 * For Aadhaar documents, returns public keys. For passports/ID cards, returns alternative CSCAs.
 *
 * Kept free of analytics and storage imports so it can be used from any layer.
 */
export function getAlternativeCSCA(
  useProtocolStore: SelfClient['useProtocolStore'],
  docCategory: DocumentCategory,
): AlternativeCSCA {
  if (docCategory === 'aadhaar' || docCategory === 'kyc') {
    const publicKeys = useProtocolStore.getState()[docCategory].public_keys;
    // Convert string[] to Record<string, string> format expected by AlternativeCSCA
    return publicKeys
      ? Object.fromEntries(
          publicKeys.map((key, index) => [`public_key_${index}`, key]),
        )
      : {};
  }
  return useProtocolStore.getState()[docCategory].alternative_csca;
}
