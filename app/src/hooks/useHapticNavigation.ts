//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { RootStackParamList } from '../navigation/index';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

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
