// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
        try {
          hideFeedbackButton();
        } catch (error) {
          if (__DEV__) {
            console.debug('Failed to hide feedback button:', error);
          }
        }
      };
    }, []),
  );
};
