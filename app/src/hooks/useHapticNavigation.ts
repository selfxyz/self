// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useCallback } from 'react';

import type { RootStackParamList } from '../navigation/index';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type NavigationAction = 'default' | 'cancel' | 'confirm';

const useHapticNavigation = <S extends keyof RootStackParamList>(
  screen: S,
  options: {
    params?: RootStackParamList[S];
    action?: NavigationAction;
  } = {},
) => {
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];

  return useCallback(() => {
    const navParams = options.params;
    switch (options.action) {
      case 'cancel':
        selectionChange();
        if (navParams !== undefined) {
          (navigation.popTo as (screen: S, params: typeof navParams) => void)(
            screen,
            navParams,
          );
        } else {
          (navigation.popTo as (screen: S) => void)(screen);
        }
        return;

      case 'confirm':
        impactMedium();
        break;

      case 'default':
      default:
        impactLight();
    }
    // it is safe to cast options.params as any because it is correct when entering the function
    if (navParams !== undefined) {
      (navigation.navigate as (screen: S, params: typeof navParams) => void)(
        screen,
        navParams,
      );
    } else {
      (navigation.navigate as (screen: S) => void)(screen);
    }
  }, [navigation, screen, options]);
};

export default useHapticNavigation;
