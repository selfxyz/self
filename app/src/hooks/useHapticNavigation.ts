// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import {
  impactLight,
  impactMedium,
  selectionChange,
} from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation/index';

type NavigationAction = 'default' | 'cancel' | 'confirm';

type ExtendedNavigation = NavigationProp<RootStackParamList> & {
  popTo?: <T extends keyof RootStackParamList>(
    screen: T,
    params?: RootStackParamList[T],
  ) => void;
};

const useHapticNavigation = <S extends keyof RootStackParamList>(
  screen: S,
  options: {
    params?: RootStackParamList[S];
    action?: NavigationAction;
  } = {},
) => {
  const navigation = useNavigation<ExtendedNavigation>();

  return useCallback(() => {
    const navParams = options.params;
    switch (options.action) {
      case 'cancel':
        selectionChange();
        if (navParams !== undefined) {
          navigation.popTo?.(screen, navParams);
        } else {
          navigation.popTo?.(screen);
        }
        return;

      case 'confirm':
        impactMedium();
        break;

      case 'default':
      default:
        impactLight();
    }
    if (navParams !== undefined) {
      (
        navigation.navigate as <T extends keyof RootStackParamList>(
          screen: T,
          params: RootStackParamList[T],
        ) => void
      )(screen, navParams);
    } else {
      (
        navigation.navigate as <T extends keyof RootStackParamList>(
          screen: T,
        ) => void
      )(screen);
    }
  }, [navigation, screen, options]);
};

export default useHapticNavigation;
