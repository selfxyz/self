// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Only export what's actually used elsewhere to enable proper tree shaking

// From provingMachine - used in screens and tests
export type { ProvingStateType } from '@/utils/proving/provingMachine';
// From provingUtils - used in tests (keeping these for testing purposes)
export {
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from '@/utils/proving/provingUtils';

// From loadingScreenStateText - used in loading screen
export { getLoadingScreenText } from '@/utils/proving/loadingScreenStateText';

// From validateDocument - used in recovery and splash screens
export {
  hasAnyValidRegisteredDocument,
  isUserRegisteredWithAlternativeCSCA,
} from '@/utils/proving/validateDocument';

export { useProvingStore } from '@/utils/proving/provingMachine';
