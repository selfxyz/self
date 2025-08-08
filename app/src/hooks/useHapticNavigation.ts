// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useCallback } from 'react';

import type { RootStackParamList } from '../navigation/index';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

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
