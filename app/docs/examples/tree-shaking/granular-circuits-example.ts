// Granular import example: Circuit utilities only
// This will tree-shake out passport parsing, certificate parsing, etc.

import { generateCircuitInputsDSC } from '@selfxyz/common/utils/circuits';
import type { PassportData } from '@selfxyz/common/types/passport';

export function exampleCircuitUsage(passportData: PassportData) {
  // Only circuit-related utilities are bundled
  const inputs = generateCircuitInputsDSC(
    passportData,
    [], // dscTree
    [], // csca tree
  );

  return inputs;
}
