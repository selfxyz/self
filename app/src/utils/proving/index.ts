// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Only export what's actually used elsewhere to enable proper tree shaking

// From provingMachine - used in screens and tests
export { type ProvingStateType, useProvingStore } from './provingMachine';

// From provingUtils - used in tests (keeping these for testing purposes)
export {
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from './provingUtils';

// From loadingScreenStateText - used in loading screen
export { getLoadingScreenText } from './loadingScreenStateText';

// From validateDocument - used in recovery and splash screens
export {
  hasAnyValidRegisteredDocument,
  isUserRegisteredWithAlternativeCSCA,
} from './validateDocument';
