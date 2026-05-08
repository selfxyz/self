// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { getPerkRailLabel, getPerksForIdType } from './perks';

const KYC_DOC_TYPE = 'kyc';

export function getDocumentBadgeLabel(docType: string): string {
  switch (docType) {
    case 'p':
    case 'i':
      return 'Hi-security';
    case 'a':
      return 'QR code scan';
    case KYC_DOC_TYPE:
      return 'Photo ID scan';
    default:
      return 'Document scan';
  }
}

export function getDocumentPerkLabel(docType: string): string | null {
  const perks = getPerksForIdType(docType);
  if (perks.length === 0) {
    return null;
  }

  return getPerkRailLabel(perks);
}
