// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { RECOVERY_PROMPT_ALLOWED_ROUTES } from '@/consts/recoveryPrompts';
import { useModal } from '@/hooks/useModal';
import { navigationRef } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

const DEFAULT_ALLOWED_ROUTES = RECOVERY_PROMPT_ALLOWED_ROUTES;

type UseRecoveryPromptsOptions = {
  allowedRoutes?: readonly string[];
};

export default function useRecoveryPrompts({
  allowedRoutes = DEFAULT_ALLOWED_ROUTES,
}: UseRecoveryPromptsOptions = {}) {
  const { homeScreenViewCount, cloudBackupEnabled, hasViewedRecoveryPhrase } =
    useSettingStore();
  const { getAllDocuments } = usePassport();
  const hasRecoveryEnabled = cloudBackupEnabled || hasViewedRecoveryPhrase;

  const { showModal, visible } = useModal({
    titleText: 'Protect your account',
    bodyText:
      'Enable cloud backup or save your recovery phrase so you can recover your account.',
    buttonText: 'Back up now',
    onButtonPress: async () => {
      if (!navigationRef.isReady()) {
        return;
      }
      navigationRef.navigate('CloudBackupSettings', {
        nextScreen: 'SaveRecoveryPhrase',
      });
    },
    onModalDismiss: () => {},
  } as const);

  const lastPromptCount = useRef<number | null>(null);
  const appStateStatus = useRef<AppStateStatus>(
    (AppState.currentState as AppStateStatus | null) ?? 'active',
  );
  const allowedRouteSet = useMemo(
    () => new Set(allowedRoutes),
    [allowedRoutes],
  );

  const isRouteEligible = useCallback(
    (routeName: string | undefined): routeName is string => {
      if (!routeName) {
        return false;
      }

      if (!allowedRouteSet.has(routeName)) {
        return false;
      }

      return true;
    },
    [allowedRouteSet],
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

    if (hasRecoveryEnabled) {
      return;
    }

    try {
      const docs = await getAllDocuments();
      const hasRegisteredDocument = Object.values(docs).some(
        doc => doc.metadata.isRegistered === true,
      );

      if (!hasRegisteredDocument) {
        return;
      }
      const shouldPrompt =
        homeScreenViewCount >= 5 && homeScreenViewCount % 5 === 0;

      if (
        shouldPrompt &&
        !visible &&
        lastPromptCount.current !== homeScreenViewCount
      ) {
        // Double-check route eligibility right before showing modal
        // to prevent showing on wrong screen if user navigated during async call
        const currentRouteNameAfterAsync =
          navigationRef.getCurrentRoute?.()?.name;

        if (isRouteEligible(currentRouteNameAfterAsync)) {
          showModal();
          lastPromptCount.current = homeScreenViewCount;
        }
      }
    } catch {
      // Silently fail to avoid breaking the hook
      // If we can't get documents, we shouldn't show the prompt
      return;
    }
  }, [
    getAllDocuments,
    hasRecoveryEnabled,
    homeScreenViewCount,
    isRouteEligible,
    showModal,
    visible,
  ]);

  useEffect(() => {
    const runMaybePrompt = () => {
      maybePrompt().catch(() => {
        // Ignore promise rejection - already handled in maybePrompt
      });
    };

    runMaybePrompt();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      const previousState = appStateStatus.current;
      appStateStatus.current = nextState;

      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active'
      ) {
        runMaybePrompt();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    const navigationUnsubscribe = navigationRef.addListener?.(
      'state',
      runMaybePrompt,
    );

    return () => {
      appStateSubscription.remove();
      if (typeof navigationUnsubscribe === 'function') {
        navigationUnsubscribe();
      }
    };
  }, [maybePrompt]);

  return { visible };
}
