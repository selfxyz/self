// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { ComponentType } from 'react';
import type {
  NativeStackNavigationOptions,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { selfUrl } from '@/consts/links';
import type { SharedRoutesParamList } from '@/navigation/types';
import ComingSoonScreen from '@/screens/shared/ComingSoonScreen';
import { WebViewScreen } from '@/screens/shared/WebViewScreen';

type ScreenName = keyof SharedRoutesParamList;

type ScreenConfig<Name extends ScreenName> = {
  screen: ComponentType<NativeStackScreenProps<SharedRoutesParamList, Name>>;
  options?: NativeStackNavigationOptions;
  initialParams?: SharedRoutesParamList[Name];
};

const sharedScreens: { [K in ScreenName]: ScreenConfig<K> } = {
  ComingSoon: {
    screen: ComingSoonScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
  },
  WebView: {
    screen: WebViewScreen,
    options: {
      headerShown: false,
    } as NativeStackNavigationOptions,
    initialParams: {
      url: selfUrl,
      title: undefined,
      shareTitle: undefined,
      shareMessage: undefined,
      shareUrl: undefined,
    },
  },
};

export default sharedScreens;
