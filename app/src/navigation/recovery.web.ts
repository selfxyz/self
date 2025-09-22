// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import DocumentDataNotFound from '@/screens/recovery/DocumentDataNotFoundScreen';

const recoveryScreens = {
  DocumentDataNotFound: {
    screen: DocumentDataNotFound,
    options: {
      headerShown: false,
      gestureEnabled: false,
      animation: 'slide_from_bottom',
      // presentation: 'modal',
    } as NativeStackNavigationOptions,
  },
};

export default recoveryScreens;
