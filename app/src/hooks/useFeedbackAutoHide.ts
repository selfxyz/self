// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { hideFeedbackButton } from '@sentry/react-native';

/**
 * Hook to automatically hide the Sentry feedback button when the screen loses focus.
 * This should be used within screens that have navigation context.
 */
export const useFeedbackAutoHide = () => {
  useFocusEffect(
    useCallback(() => {
      // When screen comes into focus, do nothing (button might be shown by user action)

      // When screen goes out of focus, hide the feedback button
      return () => {
        hideFeedbackButton();
      };
    }, []),
  );
};
