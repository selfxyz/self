// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type {
  Adapters,
  AnalyticsAdapter,
  AuthAdapter,
  CryptoAdapter,
  NavigationAdapter,
  RouteName,
} from '@selfxyz/mobile-sdk-alpha/browser';
import {
  createWebAnalyticsAdapter,
  createWebNetworkAdapter,
  webNFCScannerShim,
} from '@selfxyz/mobile-sdk-alpha/browser';

import type { WebViewBridge } from '../bridge';
import { bridgeAuthAdapter } from './auth';
import { bridgeCryptoAdapter } from './crypto';
import { createKeychainDocumentsAdapter } from './keychain-documents';

export interface CreateSdkAdaptersOpts {
  bridge: WebViewBridge;
  navigate: (path: string) => void;
  goBack: () => void;
  /**
   * Optional analytics adapter override. The WebView app passes a cohort-tag
   * observed adapter here (WIA-12); defaults to the console/endpoint adapter.
   */
  analytics?: AnalyticsAdapter;
}

export function createSdkAdapters(opts: CreateSdkAdaptersOpts): Adapters {
  const { bridge, navigate, goBack, analytics } = opts;
  const bridgeCrypto = bridgeCryptoAdapter(bridge);

  const crypto: CryptoAdapter = {
    hash: bridgeCrypto.hash,
    sign: bridgeCrypto.sign,
    generateKey: bridgeCrypto.generateKey,
    getPublicKey: bridgeCrypto.getPublicKey,
  };

  const bridgeAuth = bridgeAuthAdapter(bridge);
  const auth: AuthAdapter = {
    getPrivateKey: bridgeAuth.getPrivateKey,
  };

  const navigation: NavigationAdapter = {
    goBack,
    goTo: (routeName: RouteName, params?: Record<string, unknown>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      navigate(`/${routeName}${query}`);
    },
  };

  return {
    scanner: webNFCScannerShim,
    crypto,
    network: createWebNetworkAdapter(),
    auth,
    documents: createKeychainDocumentsAdapter(bridge),
    navigation,
    analytics: analytics ?? createWebAnalyticsAdapter(),
  };
}
