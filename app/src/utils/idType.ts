// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDDocument } from '@selfxyz/common/utils/types';

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
