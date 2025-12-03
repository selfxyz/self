// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useEffect, useState } from 'react';

import { initRemoteConfig } from '@/config/remoteConfig';

interface RemoteConfigContextValue {
  isInitialized: boolean;
  error: string | null;
}

const RemoteConfigContext = createContext<RemoteConfigContextValue>({
  isInitialized: false,
  error: null,
});

export const RemoteConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initRemoteConfig();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize remote config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Still set as initialized to not block the app
        setIsInitialized(true);
      }
    };

    init();
  }, []);

  return (
    <RemoteConfigContext.Provider value={{ isInitialized, error }}>
      {children}
    </RemoteConfigContext.Provider>
  );
};

export const useRemoteConfig = () => useContext(RemoteConfigContext);
