//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { ModalParams } from '../screens/misc/ModalScreen';

export const useModal = (params: ModalParams) => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const showModal = useCallback(() => {
    setVisible(true);
    navigation.navigate('Modal', params);
  }, [params]);

  const dismissModal = useCallback(() => {
    setVisible(false);
    const routes = navigation.getState()?.routes;
    if (routes?.at(routes.length - 1)?.name === 'Modal') {
      navigation.goBack();
    }
    params.onModalDismiss();
  }, [params]);

  return {
    showModal,
    dismissModal,
    visible,
  };
};
