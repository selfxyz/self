import { SelfBackendVerifier } from './src/SelfBackendVerifier.js';
import { countryCodes } from '@selfxyz/common/constants';
import { getUniversalLink } from '@selfxyz/common/utils/appType';
import { countries } from '@selfxyz/common/constants';
import type { AttestationId, VerificationResult, VerificationConfig } from 'src/types/types.js';
import type { IConfigStorage } from 'src/store/interface.js';
import { DefaultConfigStore } from 'src/store/DefaultConfigStore.js';
import { AllIds } from 'src/utils/constants.js';
import { InMemoryConfigStore } from 'src/store/InMemoryConfigStore.js';

export {
  SelfBackendVerifier,
  countryCodes,
  getUniversalLink,
  countries,
  AttestationId,
  IConfigStorage,
  DefaultConfigStore,
  InMemoryConfigStore,
  AllIds,
  VerificationResult,
  VerificationConfig,
};
