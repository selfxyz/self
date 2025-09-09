// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { SelfApp } from '@selfxyz/common/utils';
import { generateTEEInputsDiscloseStateless } from '@selfxyz/common/utils/circuits/registerInputs';
import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

export function generateTEEInputsDisclose(
  secret: string,
  passportData: PassportData,
  selfApp: SelfApp,
) {
  return generateTEEInputsDiscloseStateless(
    secret,
    passportData,
    selfApp,
    (document: DocumentCategory, tree) => {
      const protocolStore = useProtocolStore.getState();
      switch (tree) {
        case 'ofac':
          return protocolStore[document].ofac_trees;
        case 'commitment':
          return protocolStore[document].commitment_tree;
        default:
          throw new Error('Unknown tree type');
      }
    },
  );
}
