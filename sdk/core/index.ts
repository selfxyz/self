import { countries, countryCodes } from '@selfxyz/common/constants';
import { getUniversalLink } from '@selfxyz/common/utils/appType';

import { SelfBackendVerifier } from './src/SelfBackendVerifier.js';
import { DefaultConfigStore } from './src/store/DefaultConfigStore.js';
import { InMemoryConfigStore } from './src/store/InMemoryConfigStore.js';
import type { IConfigStorage } from './src/store/interface.js';
import type { AttestationId, VerificationConfig, VerificationResult } from './src/types/types.js';
import { AllIds } from './src/utils/constants.js';

export type { AttestationId, IConfigStorage, VerificationConfig, VerificationResult };

export {
  AllIds,
  DefaultConfigStore,
  InMemoryConfigStore,
  SelfBackendVerifier,
  countries,
  countryCodes,
  getUniversalLink,
};
