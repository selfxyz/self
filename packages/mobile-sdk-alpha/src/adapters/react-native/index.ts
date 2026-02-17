// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Concrete adapter implementations
export { createDocumentsAdapter, createInMemoryDocumentsAdapter } from './documents';
export { createAuthAdapter } from './auth';
export { createNetworkAdapter } from './network';
export { createCryptoAdapter } from './crypto';
export { reactNativeScannerAdapter } from './nfc-scanner';

// Factory
export { createReactNativeAdapters } from './factory';
export type { CreateReactNativeAdaptersOptions } from './factory';
