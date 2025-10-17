// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { createContext, useContext, useState, useCallback, type PropsWithChildren } from 'react';

export type NavigationParams = {
  IDSelection?: { countryCode: string; countryName: string; documentTypes: string[] };
};

export type ScreenName =
  | 'Home'
  | 'Generate'
  | 'Register'
  | 'Mrz'
  | 'NFC'
  | 'Documents'
  | 'CountrySelection'
  | 'IDSelection';

interface NavigationState {
  currentScreen: ScreenName;
  params?: NavigationParams[keyof NavigationParams];
}

interface NavigationContextValue {
  currentScreen: ScreenName;
  params?: NavigationParams[keyof NavigationParams];
  navigate: <T extends ScreenName>(
    screen: T,
    ...args: T extends keyof NavigationParams
      ? NavigationParams[T] extends undefined
        ? []
        : [params: NavigationParams[T]]
      : []
  ) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: PropsWithChildren) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: 'Home',
  });
  const [history, setHistory] = useState<NavigationState[]>([]);

  const navigate = useCallback(
    <T extends ScreenName>(
      screen: T,
      ...args: T extends keyof NavigationParams
        ? NavigationParams[T] extends undefined
          ? []
          : [params: NavigationParams[T]]
        : []
    ) => {
      setHistory(prev => [...prev, navigationState]);
      const params = args.length > 0 ? args[0] : undefined;
      setNavigationState({ currentScreen: screen, params });
    },
    [navigationState],
  );

  const goBack = useCallback(() => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setNavigationState(previousState);
      setHistory(prev => prev.slice(0, -1));
    }
  }, [history]);

  const canGoBack = useCallback(() => {
    return history.length > 0;
  }, [history]);

  const value: NavigationContextValue = {
    currentScreen: navigationState.currentScreen,
    params: navigationState.params,
    navigate,
    goBack,
    canGoBack,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
