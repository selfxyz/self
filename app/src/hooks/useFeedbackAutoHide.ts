// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
// Sentry feedback widget is disabled; no-op to avoid calling unstable native APIs.
export const useFeedbackAutoHide = () => {
  useFocusEffect(
    useCallback(() => {
      return () => undefined;
    }, []),
  );
};
