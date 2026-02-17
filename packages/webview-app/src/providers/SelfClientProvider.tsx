// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  bridgeNFCScannerAdapter,
  bridgeCryptoAdapter,
  bridgeAuthAdapter,
  bridgeDocumentsAdapter,
  bridgeStorageAdapter,
  bridgeAnalyticsAdapter,
  bridgeLifecycleAdapter,
  webNavigationAdapter,
  bridgeHapticAdapter,
} from '@selfxyz/webview-bridge/adapters';
import type {
  BridgeNFCScannerAdapter,
  BridgeCryptoAdapter,
  BridgeAuthAdapter,
  BridgeDocumentsAdapter,
  BridgeStorageAdapter,
  BridgeAnalyticsAdapter,
  BridgeLifecycleAdapter,
  BridgeNavigationAdapter,
  BridgeHapticAdapter,
} from '@selfxyz/webview-bridge/adapters';
import { useBridge } from './BridgeProvider';

export interface SelfClientAdapters {
  scanner: BridgeNFCScannerAdapter;
  crypto: BridgeCryptoAdapter;
  auth: BridgeAuthAdapter;
  documents: BridgeDocumentsAdapter;
  storage: BridgeStorageAdapter;
  analytics: BridgeAnalyticsAdapter;
  lifecycle: BridgeLifecycleAdapter;
  navigation: BridgeNavigationAdapter;
  haptic: BridgeHapticAdapter;
}

const SelfClientContext = createContext<SelfClientAdapters | null>(null);

export function useSelfClient(): SelfClientAdapters {
  const adapters = useContext(SelfClientContext);
  if (!adapters) {
    throw new Error('useSelfClient must be used within a SelfClientProvider');
  }
  return adapters;
}

export const SelfClientProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const bridge = useBridge();
  const navigate = useNavigate();

  const adapters = useMemo<SelfClientAdapters>(() => {
    const lifecycle = bridgeLifecycleAdapter(bridge);
    return {
      scanner: bridgeNFCScannerAdapter(bridge),
      crypto: bridgeCryptoAdapter(bridge),
      auth: bridgeAuthAdapter(bridge),
      documents: bridgeDocumentsAdapter(bridge),
      storage: bridgeStorageAdapter(bridge),
      analytics: bridgeAnalyticsAdapter(bridge),
      lifecycle,
      navigation: webNavigationAdapter(
        (path: string) => navigate(path),
        () => navigate(-1),
      ),
      haptic: bridgeHapticAdapter(bridge),
    };
  }, [bridge, navigate]);

  useEffect(() => {
    adapters.lifecycle.ready();
  }, [adapters.lifecycle]);

  return (
    <SelfClientContext.Provider value={adapters}>
      {children}
    </SelfClientContext.Provider>
  );
};
