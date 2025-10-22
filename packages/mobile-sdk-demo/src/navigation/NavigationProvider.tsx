// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type PropsWithChildren,
} from 'react';

export type NavigationParams = {
  IDSelection?: { countryCode: string; countryName: string; documentTypes: string[] };
};

export type ScreenName =
  | 'Home'
  | 'Generate'
  | 'Register'
  | 'MRZ'
  | 'NFC'
  | 'Documents'
  | 'CountrySelection'
  | 'IDSelection'
  | 'Success';

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

const MAX_HISTORY = 25;

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
      const params = args.length > 0 ? args[0] : undefined;
      setNavigationState(prevState => {
        setHistory(prevHistory => {
          const newHistory = [...prevHistory, prevState];
          return newHistory.length > MAX_HISTORY ? newHistory.slice(-MAX_HISTORY) : newHistory;
        });
        return { currentScreen: screen, params };
      });
    },
    [],
  );

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const previousState = prev[prev.length - 1];
      setNavigationState(previousState);
      return prev.slice(0, -1);
    });
  }, []);

  const historyLengthRef = useRef(0);
  useEffect(() => {
    historyLengthRef.current = history.length;
  }, [history.length]);

  const canGoBack = useCallback(() => {
    return historyLengthRef.current > 0;
  }, []);

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
