// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useCallback, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import type { ModalParams } from '@/screens/misc/ModalScreen';
import {
  getModalCallbacks,
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

export const useModal = (params: ModalParams) => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();
  const callbackIdRef = useRef<number>();

  const showModal = useCallback(() => {
    setVisible(true);
    const { onButtonPress, onModalDismiss, ...rest } = params;
    const id = registerModalCallbacks({ onButtonPress, onModalDismiss });
    callbackIdRef.current = id;
    navigation.navigate('Modal', { ...rest, callbackId: id });
  }, [params, navigation]);

  const dismissModal = useCallback(() => {
    setVisible(false);
    const routes = navigation.getState()?.routes;
    if (routes?.at(routes.length - 1)?.name === 'Modal') {
      navigation.goBack();
    }
    if (callbackIdRef.current !== undefined) {
      const callbacks = getModalCallbacks(callbackIdRef.current);
      if (callbacks) {
        try {
          callbacks.onModalDismiss();
        } catch (error) {
          // Log error but continue cleanup process
          console.warn('Error in modal dismiss callback:', error);
        }
      }
      unregisterModalCallbacks(callbackIdRef.current);
      callbackIdRef.current = undefined;
    }
  }, [navigation]);

  return {
    showModal,
    dismissModal,
    visible,
  };
};
