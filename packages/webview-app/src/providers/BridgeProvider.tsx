import React, { createContext, useContext, useMemo } from 'react';
import { WebViewBridge } from '@selfxyz/webview-bridge';

const BridgeContext = createContext<WebViewBridge | null>(null);

export const useBridge = (): WebViewBridge => {
  const bridge = useContext(BridgeContext);
  if (!bridge) throw new Error('useBridge must be used within BridgeProvider');
  return bridge;
};

interface BridgeProviderProps {
  children: React.ReactNode;
}

export const BridgeProvider: React.FC<BridgeProviderProps> = ({ children }) => {
  const bridge = useMemo(() => {
    return new WebViewBridge({
      debug: import.meta.env.DEV,
    });
  }, []);

  return (
    <BridgeContext.Provider value={bridge}>
      {children}
    </BridgeContext.Provider>
  );
};
