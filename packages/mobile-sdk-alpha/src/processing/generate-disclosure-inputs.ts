// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { SelfApp } from '@selfxyz/common/utils';
import { generateTEEInputsDiscloseStateless } from '@selfxyz/common/utils/circuits/registerInputs';

import { useProtocolStore } from '../stores/protocolStore';

export function generateTEEInputsDisclose(secret: string, passportData: PassportData, selfApp: SelfApp) {
  return generateTEEInputsDiscloseStateless(secret, passportData, selfApp, (document: DocumentCategory, tree) => {
    const protocolStore = useProtocolStore.getState();
    const docStore = (protocolStore as any)[document];
    if (!docStore) {
      throw new Error(`Unknown or unloaded document category in protocol store: ${document}`);
    }
    switch (tree) {
      case 'ofac':
        return docStore.ofac_trees;
      case 'commitment':
        if (!docStore.commitment_tree) {
          throw new Error('Commitment tree not loaded');
        }
        return docStore.commitment_tree;
      default:
        throw new Error('Unknown tree type');
    }
  });
}
