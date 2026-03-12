// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  bridgeCryptoAdapter,
  bridgeAuthAdapter,
  indexedDBDocumentsAdapter,
  bridgeStorageAdapter,
  consoleAnalyticsAdapter,
  bridgeLifecycleAdapter,
  webNavigationAdapter,
  noOpHapticAdapter,
  bridgeBiometricsAdapter,
} from '@selfxyz/webview-bridge/adapters';
import type {
  BridgeCryptoAdapter,
  BridgeAuthAdapter,
  BridgeDocumentsAdapter,
  BridgeStorageAdapter,
  BridgeAnalyticsAdapter,
  BridgeLifecycleAdapter,
  BridgeNavigationAdapter,
  BridgeHapticAdapter,
  BridgeBiometricsAdapter,
} from '@selfxyz/webview-bridge/adapters';
import { useBridge } from './BridgeProvider';
import { useVerificationRequest } from './VerificationRequestProvider';

export interface SelfClientAdapters {
  crypto: BridgeCryptoAdapter;
  auth: BridgeAuthAdapter;
  documents: BridgeDocumentsAdapter;
  storage: BridgeStorageAdapter;
  analytics: BridgeAnalyticsAdapter;
  lifecycle: BridgeLifecycleAdapter;
  navigation: BridgeNavigationAdapter;
  haptic: BridgeHapticAdapter;
  biometrics: BridgeBiometricsAdapter;
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
  const { verificationId } = useVerificationRequest();

  const adapters = useMemo<SelfClientAdapters>(() => {
    const lifecycle = bridgeLifecycleAdapter(bridge);

    return {
      crypto: bridgeCryptoAdapter(bridge),
      auth: bridgeAuthAdapter(bridge),
      documents: indexedDBDocumentsAdapter(),
      storage: bridgeStorageAdapter(bridge),
      analytics: consoleAnalyticsAdapter(),
      lifecycle,
      navigation: webNavigationAdapter(
        (path: string) => navigate(path),
        () => navigate(-1),
      ),
      haptic: noOpHapticAdapter(),
      biometrics: bridgeBiometricsAdapter(bridge),
    };
  }, [bridge, navigate]);

  const lastReadyRef = useRef<{
    lifecycle: BridgeLifecycleAdapter;
    verificationId?: string;
  } | null>(null);
  useEffect(() => {
    if (
      lastReadyRef.current?.lifecycle === adapters.lifecycle &&
      lastReadyRef.current?.verificationId === verificationId
    ) {
      return;
    }
    adapters.lifecycle.ready(
      verificationId ? { verificationId } : {},
    );
    lastReadyRef.current = { lifecycle: adapters.lifecycle, verificationId };
  }, [adapters.lifecycle, verificationId]);

  useEffect(() => {
    return bridge.on('lifecycle', 'cancel', () => {
      navigate('/', { replace: true });
    });
  }, [bridge, navigate]);

  return (
    <SelfClientContext.Provider value={adapters}>
      {children}
    </SelfClientContext.Provider>
  );
};
