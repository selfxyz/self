// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@selfxyz/mobile-sdk-alpha/components';
import {
  amber500,
  red600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { useNetInfo } from '@/hooks/useNetInfo';
import {
  type ConnectivityBannerState,
  getConnectivityBannerState,
} from '@/utils/connectivity';

const BANNER_CONTENT: Record<
  Exclude<ConnectivityBannerState, 'online'>,
  {
    backgroundColor: string;
    body: string;
    textColor: string;
    title: string;
  }
> = {
  offline: {
    backgroundColor: red600,
    title: 'No internet connection',
    body: 'Some features are unavailable until you reconnect.',
    textColor: white,
  },
  weak: {
    backgroundColor: amber500,
    title: 'Connection is weak',
    body: 'Some actions may take longer than usual.',
    textColor: white,
  },
};

export function ConnectivityBanner() {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();
  const state = useMemo(() => getConnectivityBannerState(netInfo), [netInfo]);

  if (state === 'online') {
    return null;
  }

  const content = BANNER_CONTENT[state];
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  );

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      backgroundColor={content.backgroundColor}
      paddingTop={topInset + 10}
      paddingHorizontal={20}
      paddingBottom={10}
    >
      <Text color={content.textColor} fontSize={14} fontWeight="700">
        {content.title}
      </Text>
      <Text
        color={content.textColor}
        fontSize={12}
        marginTop="$1"
        style={{ opacity: 0.9 }}
      >
        {content.body}
      </Text>
    </View>
  );
}
