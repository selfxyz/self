// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Barrel export file for utility functions.
 * Re-exports all utilities from root-level files and subdirectories.
 */

// Crypto utilities
export type { ModalCallbacks } from '@/utils/modalCallbackRegistry';
export * from '@/utils/crypto/cryptoLoader';
export * from '@/utils/crypto/ethers';

// Development utilities
export * from '@/utils/crypto/mnemonic';

// Format utilities
export { IS_DEV_MODE } from '@/utils/devUtils';

// Style utilities
export { extraYPadding, normalizeBorderWidth } from '@/utils/styleUtils';

// JSON utilities
export { formatUserId } from '@/utils/formatUserId';

export {
  getModalCallbacks,
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

// Modal utilities
export { safeJsonParse, safeJsonStringify } from '@/utils/jsonUtils';

// Retry utilities
export { withRetries } from '@/utils/retry';
