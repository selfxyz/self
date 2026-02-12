import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useBridge } from './BridgeProvider';
import {
  bridgeNFCScannerAdapter,
  bridgeCryptoAdapter,
  bridgeAuthAdapter,
  bridgeDocumentsAdapter,
  bridgeStorageAdapter,
  bridgeAnalyticsAdapter,
  webNavigationAdapter,
  bridgeLifecycleAdapter,
} from '@selfxyz/webview-bridge/adapters';
import type { LifecycleAdapter } from '@selfxyz/webview-bridge/adapters';

// Re-export types for convenience
export type { LifecycleAdapter };

interface SelfClientContextValue {
  lifecycle: LifecycleAdapter;
  // The full SelfClient will be wired here once createSelfClient is available
  // For now, expose the individual adapters for direct use
  adapters: {
    scanner: ReturnType<typeof bridgeNFCScannerAdapter>;
    crypto: ReturnType<typeof bridgeCryptoAdapter>;
    auth: ReturnType<typeof bridgeAuthAdapter>;
    documents: ReturnType<typeof bridgeDocumentsAdapter>;
    storage: ReturnType<typeof bridgeStorageAdapter>;
    analytics: ReturnType<typeof bridgeAnalyticsAdapter>;
    navigation: ReturnType<typeof webNavigationAdapter>;
  };
}

const SelfClientContext = createContext<SelfClientContextValue | null>(null);

export const useSelfClient = (): SelfClientContextValue => {
  const ctx = useContext(SelfClientContext);
  if (!ctx) throw new Error('useSelfClient must be used within SelfClientProvider');
  return ctx;
};

interface SelfClientProviderProps {
  children: React.ReactNode;
}

export const SelfClientProvider: React.FC<SelfClientProviderProps> = ({ children }) => {
  const bridge = useBridge();

  // Note: useNavigate must be used inside BrowserRouter, which is in App.tsx
  // This provider is wrapped inside BrowserRouter, so we need a different approach
  // We'll use a callback-based navigation adapter

  const value = useMemo<SelfClientContextValue>(() => {
    // Navigation uses a mutable ref that gets set when the router is ready
    let navigateFn: ((path: string, state?: Record<string, unknown>) => void) | null = null;
    let goBackFn: (() => void) | null = null;

    const navigation = webNavigationAdapter(
      (path, state) => navigateFn?.(path, state),
      () => goBackFn?.(),
    );

    // These will be set by the NavigationSetter component below
    (navigation as any).__setNavigate = (fn: typeof navigateFn) => { navigateFn = fn; };
    (navigation as any).__setGoBack = (fn: typeof goBackFn) => { goBackFn = fn; };

    const lifecycle = bridgeLifecycleAdapter(bridge);

    return {
      lifecycle,
      adapters: {
        scanner: bridgeNFCScannerAdapter(bridge),
        crypto: bridgeCryptoAdapter(bridge),
        auth: bridgeAuthAdapter(bridge),
        documents: bridgeDocumentsAdapter(bridge),
        storage: bridgeStorageAdapter(bridge),
        analytics: bridgeAnalyticsAdapter(bridge),
        navigation,
      },
    };
  }, [bridge]);

  // Signal ready to native
  useEffect(() => {
    value.lifecycle.ready();
  }, [value]);

  return (
    <SelfClientContext.Provider value={value}>
      {children}
    </SelfClientContext.Provider>
  );
};
