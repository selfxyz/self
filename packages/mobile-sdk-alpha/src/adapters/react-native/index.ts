// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type { CreateReactNativeAdaptersOptions } from './factory';

// Concrete adapter implementations
export { createAuthAdapter } from './auth';
export { createCryptoAdapter } from './crypto';
export { createDocumentsAdapter, createInMemoryDocumentsAdapter } from './documents';
export { createNetworkAdapter } from './network';

// Factory
export { createReactNativeAdapters } from './factory';
export { reactNativeScannerAdapter } from './nfc-scanner';
