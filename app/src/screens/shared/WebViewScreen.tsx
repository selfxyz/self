// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  WebViewScreen as SDKWebViewScreen,
  type WebViewScreenParams,
} from '@selfxyz/mobile-sdk-alpha/components';

import type { SharedRoutesParamList } from '@/navigation/types';

type WebViewScreenProps = NativeStackScreenProps<
  SharedRoutesParamList,
  'WebView'
>;

const defaultUrl = 'https://self.xyz';

/**
 * WebViewScreen is a thin wrapper around the SDK's WebViewScreen component.
 * It adapts the React Navigation props to the SDK's navigation-agnostic props.
 */
export const WebViewScreen: React.FC<WebViewScreenProps> = ({
  navigation,
  route,
}) => {
  const params = route?.params as WebViewScreenParams | undefined;
  const safeParams: WebViewScreenParams = params ?? { url: defaultUrl };
  const { top, bottom } = useSafeAreaInsets();

  const stackCanGoBack =
    typeof navigation?.canGoBack === 'function'
      ? navigation.canGoBack()
      : false;

  const handleBackPress = useCallback(() => {
    if (typeof navigation?.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <SDKWebViewScreen
      {...safeParams}
      canGoBack={stackCanGoBack}
      onBackPress={handleBackPress}
      safeAreaTop={top}
      safeAreaBottom={bottom}
    />
  );
};
