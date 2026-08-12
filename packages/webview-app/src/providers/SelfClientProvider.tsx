// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { DocumentsAdapter, SelfClient } from '@selfxyz/mobile-sdk-alpha/browser';
import { createListenersMap, createSelfClient, createWebAnalyticsAdapter } from '@selfxyz/mobile-sdk-alpha/browser';
import type {
  BridgeAnalyticsAdapter,
  BridgeBiometricsAdapter,
  BridgeHapticAdapter,
  BridgeLifecycleAdapter,
} from '@selfxyz/webview-bridge/adapters';
import {
  bridgeBiometricsAdapter,
  bridgeHapticAdapter,
  bridgeLifecycleAdapter,
  bridgeStorageAdapter,
  consoleAnalyticsAdapter,
  createSdkAdapters,
} from '@selfxyz/webview-bridge/adapters';

import { clearReferenceTag, setReferenceTag } from '../config/sentry';
import { withCohortTags } from '../observability/observedAnalytics';
import { ensureSecret } from '../utils/secretManager';
import { useBridge } from './BridgeProvider';
import { useOperatingMode } from './OperatingModeProvider';
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

export const SelfClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bridge = useBridge();
  const navigate = useNavigate();
  const { verificationId } = useVerificationRequest();
  const { referenceId } = useOperatingMode();

  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const stableNavigate = useCallback((path: string) => navigateRef.current(path), []);
  const stableGoBack = useCallback(() => navigateRef.current(-1), []);

  const webViewAdapters = useMemo<WebViewAdapters>(() => {
    const sdkAdapters = createSdkAdapters({
      bridge,
      navigate: stableNavigate,
      goBack: stableGoBack,
      analytics: withCohortTags(createWebAnalyticsAdapter()),
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

    return {
      client,
      lifecycle: bridgeLifecycleAdapter(bridge),
      haptic: bridgeHapticAdapter(bridge),
      biometrics: bridgeBiometricsAdapter(bridge),
      analytics: withCohortTags(consoleAnalyticsAdapter()),
      documents: sdkAdapters.documents,
    };
  }, [bridge, stableNavigate, stableGoBack]);

  useEffect(() => {
    const storage = bridgeStorageAdapter(bridge);
    ensureSecret(storage).catch(() => {
      console.error('Failed to ensure secret');
    });
  }, [bridge]);

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
    webViewAdapters.lifecycle.ready(verificationId ? { verificationId } : {});
    lastReadyRef.current = { lifecycle: webViewAdapters.lifecycle, verificationId };
  }, [webViewAdapters.lifecycle, verificationId]);

  useEffect(() => {
    return bridge.on('lifecycle', 'cancel', () => {
      navigate('/', { replace: true });
    });
  }, [bridge, navigate]);

  // Durable Sentry session tag, set as soon as the host-minted id is known so
  // events outside the analytics path still correlate; cleared on unmount.
  useEffect(() => {
    if (!referenceId) return undefined;
    setReferenceTag(referenceId, verificationId);
    return () => clearReferenceTag();
  }, [referenceId, verificationId]);

  return <SelfClientContext.Provider value={webViewAdapters}>{children}</SelfClientContext.Provider>;
};

export function useSelfClient(): WebViewAdapters {
  const adapters = useContext(SelfClientContext);
  if (!adapters) {
    throw new Error('useSelfClient must be used within a SelfClientProvider');
  }
  return adapters;
}
