// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
