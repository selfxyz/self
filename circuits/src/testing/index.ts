// Re-export utility functions for generating mock inputs in circuit tests
export { generateMockRsaPkcs1v1_5Inputs } from '../../tests/utils/generateMockInputsInCircuits.js';
export {
  generateMockRsaPssInputs,
  generateMalleableRsaPssInputs,
} from '../../tests/utils/generateMockInputsRsaPss.js';

// Re-export test case configurations
export {
  sigAlgs as registerSigAlgs,
  fullSigAlgs as registerFullSigAlgs,
} from '../../tests/register/test_cases.js';
export {
  sigAlgs as registerIdSigAlgs,
  fullSigAlgs as registerIdFullSigAlgs,
} from '../../tests/register_id/test_cases.js';
export {
  sigAlgs as dscSigAlgs,
  fullSigAlgs as dscFullSigAlgs,
} from '../../tests/dsc/test_cases.js';
export {
  fullAlgorithms as rsaPssFullAlgorithms,
  sigAlgs as rsaPssSigAlgs,
  AdditionalCases as rsaPssAdditionalCases,
} from '../../tests/utils/testcase/rsapss.js';
