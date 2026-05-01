// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@selfxyz/mobile-sdk-alpha/components';
import {
  amber50,
  amber700,
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
    body: 'Some actions are unavailable until you reconnect.',
    textColor: white,
  },
  weak: {
    backgroundColor: amber50,
    title: 'Connection is weak',
    body: 'This step may take longer than usual.',
    textColor: amber700,
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

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      backgroundColor={content.backgroundColor}
      paddingTop={Math.max(insets.top, 10)}
      paddingHorizontal={20}
      paddingVertical={10}
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
