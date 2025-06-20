import { SelfBackendVerifier } from './src/SelfBackendVerifier.js';
import { countryCodes } from '@selfxyz/common/constants/constants';
import { getUniversalLink } from '@selfxyz/common/utils/appType';
import { countries } from '@selfxyz/common';
import type { AttestationId } from 'src/types/types.js';
import type { IConfigStorage } from 'src/store/interface.js';
import { DefaultConfigStore } from 'src/store/DefaultConfigStore.js';

export {
  SelfBackendVerifier,
  countryCodes,
  getUniversalLink,
  countries,
  AttestationId,
  IConfigStorage,
  DefaultConfigStore
};
