// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentMetadata } from '@selfxyz/common';

export const isDocumentInactive = (metadata: DocumentMetadata): boolean => {
  if (
    metadata.documentCategory === 'id_card' ||
    metadata.documentCategory === 'passport' ||
    metadata.documentCategory === 'kyc'
  ) {
    return false;
  }

  //for aadhaar migration
  if (metadata.hasExpirationDate === undefined) {
    return true;
  }

  return false;
};
