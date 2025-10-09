// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { useModal } from '@/hooks/useModal';
import { navigationRef } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

const DEFAULT_DISALLOWED_ROUTES = [
  'DocumentCamera',
  'DocumentCameraTrouble',
  'DocumentNFCMethodSelection',
  'DocumentNFCScan',
  'DocumentNFCTrouble',
  'QRCodeViewFinder',
  'QRCodeTrouble',
] as const;

type UseRecoveryPromptsOptions = {
  allowedRoutes?: string[];
  disallowedRoutes?: string[];
};

// TODO: need to debug and test the logic. it pops up too often.
export default function useRecoveryPrompts({
  allowedRoutes,
  disallowedRoutes = DEFAULT_DISALLOWED_ROUTES,
}: UseRecoveryPromptsOptions = {}) {
  const { loginCount, cloudBackupEnabled, hasViewedRecoveryPhrase } =
    useSettingStore();
  const { getAllDocuments } = usePassport();
  const { showModal, visible } = useModal({
    titleText: 'Protect your account',
    bodyText:
      'Enable cloud backup or save your recovery phrase so you can recover your account.',
    buttonText: 'Back up now',
    onButtonPress: async () => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('CloudBackupSettings', {
          nextScreen: 'SaveRecoveryPhrase',
        });
      }
    },
    onModalDismiss: () => {},
  } as const);

  const lastPromptCount = useRef<number | null>(null);
  const appStateStatus = useRef<AppStateStatus>(
    (AppState.currentState as AppStateStatus | null) ?? 'active',
  );
  const allowedRouteSet = useMemo(
    () => (allowedRoutes ? new Set(allowedRoutes) : null),
    [allowedRoutes],
  );
  const disallowedRouteSet = useMemo(
    () => new Set(disallowedRoutes),
    [disallowedRoutes],
  );

  const isRouteEligible = useCallback(
    (routeName: string | undefined): routeName is string => {
      if (!routeName) {
        return false;
      }
      if (allowedRouteSet && !allowedRouteSet.has(routeName)) {
        return false;
      }
      return !disallowedRouteSet.has(routeName);
    },
    [allowedRouteSet, disallowedRouteSet],
  );

  const maybePrompt = useCallback(async () => {
    if (!navigationRef.isReady()) {
      return;
    }
    if (appStateStatus.current !== 'active') {
      return;
    }
    const currentRouteName = navigationRef.getCurrentRoute?.()?.name;
    if (!isRouteEligible(currentRouteName)) {
      return;
    }
    if (cloudBackupEnabled || hasViewedRecoveryPhrase) {
      return;
    }
    try {
      const docs = await getAllDocuments();
      if (Object.keys(docs).length === 0) {
        return;
      }
      const shouldPrompt =
        loginCount > 0 && (loginCount <= 3 || (loginCount - 3) % 5 === 0);
      if (
        shouldPrompt &&
        !visible &&
        lastPromptCount.current !== loginCount
      ) {
        showModal();
        lastPromptCount.current = loginCount;
      }
    } catch {
      // Silently fail to avoid breaking the hook
      // If we can't get documents, we shouldn't show the prompt
      return;
    }
  }, [
    cloudBackupEnabled,
    getAllDocuments,
    hasViewedRecoveryPhrase,
    isRouteEligible,
    loginCount,
    showModal,
    visible,
  ]);

  useEffect(() => {
    void maybePrompt();
  }, [maybePrompt]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const previousState = appStateStatus.current;
      appStateStatus.current = nextState;
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active'
      ) {
        void maybePrompt();
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, [maybePrompt]);

  useEffect(() => {
    const unsubscribe = navigationRef.addListener?.('state', () => {
      void maybePrompt();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [maybePrompt]);

  return { visible };
}
