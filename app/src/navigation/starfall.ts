// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import StarfallPushCodeScreen from '@/screens/starfall/StarfallPushCodeScreen';

const starfallScreens = {
  StarfallPushCode: {
    screen: StarfallPushCodeScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
};

export default starfallScreens;
