// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import { useSafeAreaInsets as useSafeAreaInsetsOriginal } from 'react-native-safe-area-context';

// gives bare minimums in case safe area doesnt provide for example space for status bar icons.
export function useSafeAreaInsets() {
  const insets = useSafeAreaInsetsOriginal();
  const minimum = Platform.select({ ios: 54, android: 26, web: 48 });
  return {
    ...insets,
    top: Math.max(insets.top, minimum || 0),
  };
}
