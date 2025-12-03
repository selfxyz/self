// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// This module combines:
// 1. Shared proving utilities from @selfxyz/common (cross-workspace)
// 2. App-specific proving helpers (loadingScreenStateText, validateDocument)

// Only export what's actually used elsewhere to enable proper tree shaking

// From provingMachine - used in screens and tests
export type { ProvingStateType } from '@selfxyz/mobile-sdk-alpha';
// From provingUtils - used in tests (keeping these for testing purposes)
export {
  encryptAES256GCM,
  getPayload,
  getWSDbRelayerUrl,
} from '@selfxyz/common/utils/proving';

// From loadingScreenStateText - used in loading screen
export { getLoadingScreenText } from '@/proving/loadingScreenStateText';
