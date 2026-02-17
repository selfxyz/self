// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type {
  Adapters,
  AnalyticsAdapter,
  AuthAdapter,
  ClockAdapter,
  CryptoAdapter,
  DocumentsAdapter,
  LoggerAdapter,
  NavigationAdapter,
  NFCScannerAdapter,
  NetworkAdapter,
  StorageAdapter,
  TrackEventParams,
} from '../../types/public';

import { createAuthAdapter } from './auth';
import { createCryptoAdapter } from './crypto';
import { createDocumentsAdapter } from './documents';
import { createNetworkAdapter } from './network';
import { reactNativeScannerAdapter } from './nfc-scanner';

export interface CreateReactNativeAdaptersOptions {
  /** Required — app-specific route mapping. No sensible default exists. */
  navigation: NavigationAdapter;
  /** Override the default NFC scanner adapter. */
  scanner?: NFCScannerAdapter;
  /** Override the default AsyncStorage documents adapter. */
  documents?: DocumentsAdapter;
  /** Override the default Keychain auth adapter. */
  auth?: AuthAdapter;
  /** Override the default @noble/hashes crypto adapter. */
  crypto?: CryptoAdapter;
  /** Override the default fetch+WebSocket network adapter. */
  network?: NetworkAdapter;
  /** Optional analytics adapter. Defaults to no-op. */
  analytics?: AnalyticsAdapter;
  /** Optional storage adapter. Left undefined by default (SDK provides its own fallback). */
  storage?: StorageAdapter;
  /** Optional clock adapter. Left undefined by default (SDK provides its own fallback). */
  clock?: ClockAdapter;
  /** Optional logger adapter. Left undefined by default (SDK provides its own fallback). */
  logger?: LoggerAdapter;
}

/** No-op analytics adapter that silently drops all events. */
const noopAnalytics: AnalyticsAdapter = {
  trackEvent: (_event: string, _payload?: TrackEventParams) => {},
};

/**
 * Creates a complete {@link Adapters} bundle pre-configured for React Native.
 *
 * Only `navigation` is required — every other adapter has a sensible default
 * implementation that can be overridden if needed.
 *
 * @example
 * ```ts
 * const adapters = createReactNativeAdapters({
 *   navigation: {
 *     goBack: () => nav.goBack(),
 *     goTo: (route, params) => nav.navigate(route, params),
 *   },
 * });
 *
 * const client = createSelfClient({ config: {}, adapters, listeners });
 * ```
 */
export function createReactNativeAdapters(opts: CreateReactNativeAdaptersOptions): Adapters {
  return {
    navigation: opts.navigation,
    scanner: opts.scanner ?? reactNativeScannerAdapter,
    documents: opts.documents ?? createDocumentsAdapter(),
    auth: opts.auth ?? createAuthAdapter(),
    crypto: opts.crypto ?? createCryptoAdapter(),
    network: opts.network ?? createNetworkAdapter(),
    analytics: opts.analytics ?? noopAnalytics,
    storage: opts.storage,
    clock: opts.clock,
    logger: opts.logger,
  };
}
