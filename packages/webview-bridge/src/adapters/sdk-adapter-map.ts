// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';
import type {
  Adapters,
  CryptoAdapter,
  AuthAdapter,
  NavigationAdapter,
  RouteName,
} from '@selfxyz/mobile-sdk-alpha/browser';
import { bridgeCryptoAdapter } from './crypto';
import { bridgeAuthAdapter } from './auth';
import { createKeychainDocumentsAdapter } from './keychain-documents';
import {
  createWebAnalyticsAdapter,
  createWebNetworkAdapter,
  webNFCScannerShim,
} from '@selfxyz/mobile-sdk-alpha/browser';

export interface CreateSdkAdaptersOpts {
  bridge: WebViewBridge;
  navigate: (path: string) => void;
  goBack: () => void;
}

export function createSdkAdapters(opts: CreateSdkAdaptersOpts): Adapters {
  const { bridge, navigate, goBack } = opts;
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
    analytics: createWebAnalyticsAdapter(),
  };
}
