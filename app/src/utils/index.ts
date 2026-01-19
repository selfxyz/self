// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Barrel export file for utility functions.
 * Re-exports all utilities from root-level files and subdirectories.
 */

// Crypto utilities
export type { ModalCallbacks } from '@/utils/modalCallbackRegistry';

// WebView utilities
export type { WebViewRequestWithIosProps } from '@/utils/webview';

export {
  DISALLOWED_SCHEMES,
  TRUSTED_DOMAINS,
  isAllowedAboutUrl,
  isSameOrigin,
  isTrustedDomain,
  isUserInitiatedTopFrameNavigation,
} from '@/utils/webview';

// Format utilities
export { IS_DEV_MODE } from '@/utils/devUtils';

export {
  computeHmac,
  pbkdf2,
  randomBytes,
  sha256,
  sha512,
} from '@/utils/crypto/ethers';

// Style utilities
export { extraYPadding, normalizeBorderWidth } from '@/utils/styleUtils';

// JSON utilities
export { formatUserId } from '@/utils/formatUserId';

// Document utilities
export { getDocumentTypeName } from '@/utils/documentUtils';

export {
  getModalCallbacks,
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

// Development utilities
export { isMnemonic, parseMnemonic } from '@/utils/crypto/mnemonic';

export { loadCryptoUtils, loadProvingUtils } from '@/utils/crypto/cryptoLoader';

// Modal utilities
export { safeJsonParse, safeJsonStringify } from '@/utils/jsonUtils';

// Retry utilities
export { withRetries } from '@/utils/retry';
