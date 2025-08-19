// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { PassportData } from '@selfxyz/common/types';
import {
  generateCircuitInputsDSC,
  getCircuitNameFromPassportData,
} from '@selfxyz/common/utils';

export function generateTEEInputsDSC(
  passportData: PassportData,
  cscaTree: string[][],
  env: 'prod' | 'stg',
) {
  const inputs = generateCircuitInputsDSC(passportData, cscaTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}
