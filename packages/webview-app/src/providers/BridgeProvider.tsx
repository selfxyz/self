// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useMemo } from 'react';
import { WebViewBridge } from '@selfxyz/webview-bridge';
import { parseBrowserHostTargetOrigin } from '../utils/verificationRequest';

const BridgeContext = createContext<WebViewBridge | null>(null);

export function useBridge(): WebViewBridge {
  const bridge = useContext(BridgeContext);
  if (!bridge) {
    throw new Error('useBridge must be used within a BridgeProvider');
  }
  return bridge;
}

export const BridgeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const bridge = useMemo(
    () => {
      const isDev = import.meta.env.DEV;

      return new WebViewBridge({
        debug: isDev,
        browserHost: {
          targetOrigin:
            parseBrowserHostTargetOrigin(window.location.search, {
              allowWildcard: isDev,
            }) ?? (isDev ? '*' : undefined),
        },
      });
    },
    [],
  );

  return (
    <BridgeContext.Provider value={bridge}>{children}</BridgeContext.Provider>
  );
};
