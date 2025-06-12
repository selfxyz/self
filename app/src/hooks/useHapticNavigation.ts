// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 Social Connect Labs, Inc.
//
// This file is licensed under the Business Source License 1.1 (BSL-1.1).
//
// Use of this software is governed by the Business Source License included in the LICENSE file.
//
// As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { RootStackParamList } from '../Navigation';
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
    switch (options.action) {
      case 'cancel':
        selectionChange();
        // it is safe to cast options.params as any because it is correct when entering the function
        navigation.popTo(screen, options.params as any);
        return;

      case 'confirm':
        impactMedium();
        break;

      case 'default':
      default:
        impactLight();
    }
    // it is safe to cast options.params as any because it is correct when entering the function
    navigation.navigate(screen, options.params as any);
  }, [navigation, screen, options.action]);
};

export default useHapticNavigation;
