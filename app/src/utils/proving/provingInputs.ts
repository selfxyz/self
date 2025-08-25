// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { SelfApp } from '@selfxyz/common/utils';
import {
  generateCircuitInputsRegister,
  generateTEEInputsDiscloseStateless,
  generateTEEInputsDSC,
  generateTEEInputsRegister,
} from '@selfxyz/common/utils/circuits/registerInputs';

import { useProtocolStore } from '@/stores/protocolStore';

export {
  generateCircuitInputsRegister,
  generateTEEInputsDSC,
  generateTEEInputsRegister,
};
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
