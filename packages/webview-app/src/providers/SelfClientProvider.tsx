// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SelfClient } from '@selfxyz/mobile-sdk-alpha/browser';
import { createSelfClient, createListenersMap } from '@selfxyz/mobile-sdk-alpha/browser';
import {
  createSdkAdapters,
  createKeychainDocumentsAdapter,
  bridgeLifecycleAdapter,
  bridgeHapticAdapter,
  bridgeBiometricsAdapter,
  consoleAnalyticsAdapter,
} from '@selfxyz/webview-bridge/adapters';
import type {
  BridgeLifecycleAdapter,
  BridgeHapticAdapter,
  BridgeBiometricsAdapter,
  BridgeAnalyticsAdapter,
} from '@selfxyz/webview-bridge/adapters';
import type { DocumentsAdapter } from '@selfxyz/mobile-sdk-alpha/browser';
import { useBridge } from './BridgeProvider';
import { useVerificationRequest } from './VerificationRequestProvider';

export interface WebViewAdapters {
  client: SelfClient;
  lifecycle: BridgeLifecycleAdapter;
  haptic: BridgeHapticAdapter;
  biometrics: BridgeBiometricsAdapter;
  analytics: BridgeAnalyticsAdapter;
  documents: DocumentsAdapter;
}

const SelfClientContext = createContext<WebViewAdapters | null>(null);

export function useSelfClient(): WebViewAdapters {
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

  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const stableNavigate = useCallback((path: string) => navigateRef.current(path), []);
  const stableGoBack = useCallback(() => navigateRef.current(-1), []);

  const webViewAdapters = useMemo<WebViewAdapters>(() => {
    const sdkAdapters = createSdkAdapters({
      bridge,
      navigate: stableNavigate,
      goBack: stableGoBack,
    });

    const { map: listeners } = createListenersMap();
    const client = createSelfClient({
      config: {
        platform: 'webview',
        debug: import.meta.env.DEV,
      },
      adapters: sdkAdapters,
      listeners,
    });

    const documents = createKeychainDocumentsAdapter(bridge);

    return {
      client,
      lifecycle: bridgeLifecycleAdapter(bridge),
      haptic: bridgeHapticAdapter(bridge),
      biometrics: bridgeBiometricsAdapter(bridge),
      analytics: consoleAnalyticsAdapter(),
      documents,
    };
  }, [bridge, stableNavigate, stableGoBack]);

  const lastReadyRef = useRef<{
    lifecycle: BridgeLifecycleAdapter;
    verificationId?: string;
  } | null>(null);
  useEffect(() => {
    if (
      lastReadyRef.current?.lifecycle === webViewAdapters.lifecycle &&
      lastReadyRef.current?.verificationId === verificationId
    ) {
      return;
    }
    webViewAdapters.lifecycle.ready(
      verificationId ? { verificationId } : {},
    );
    lastReadyRef.current = { lifecycle: webViewAdapters.lifecycle, verificationId };
  }, [webViewAdapters.lifecycle, verificationId]);

  useEffect(() => {
    return bridge.on('lifecycle', 'cancel', () => {
      navigate('/', { replace: true });
    });
  }, [bridge, navigate]);

  return (
    <SelfClientContext.Provider value={webViewAdapters}>
      {children}
    </SelfClientContext.Provider>
  );
};
