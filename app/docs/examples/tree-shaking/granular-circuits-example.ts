// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Granular import example: Circuit utilities only
// This will tree-shake out passport parsing, certificate parsing, etc.

import type { PassportData } from '@selfxyz/common/types/passport';
import { generateCircuitInputsDSC } from '@selfxyz/common/utils/circuits';

export function exampleCircuitUsage(passportData: PassportData) {
  // Only circuit-related utilities are bundled
  const inputs = generateCircuitInputsDSC(
    passportData,
    [], // dscTree
    [], // csca tree
  );

  return inputs;
}
