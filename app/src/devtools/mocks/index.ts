// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  turnkeyOAuthRedirectAndroidUri,
  turnkeyOAuthRedirectIosUri,
} from '@/consts/links';

// Turnkey OAuth redirect URIs
export const TURNKEY_OAUTH_REDIRECT_URI_ANDROID =
  turnkeyOAuthRedirectAndroidUri;

export const TURNKEY_OAUTH_REDIRECT_URI_IOS = turnkeyOAuthRedirectIosUri;

// Re-export all mocks for easier imports
export { parseScanResponse, scan } from '@/devtools/mocks/nfcScanner';
