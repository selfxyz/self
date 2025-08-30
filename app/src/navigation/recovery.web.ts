// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazyWithPreload } from '@/navigation/lazyWithPreload';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const PassportDataNotFound = lazyWithPreload(
  () => import('@/screens/recovery/PassportDataNotFoundScreen'),
);

const recoveryScreens = {
  PassportDataNotFound: {
    screen: PassportDataNotFound,
    options: {
      headerShown: false,
      gestureEnabled: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
};

export default recoveryScreens;
