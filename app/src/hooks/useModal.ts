// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef, useState } from 'react';

import { navigationRef } from '@/navigation';
import type { ModalParams } from '@/screens/app/ModalScreen';
import {
  getModalCallbacks,
  registerModalCallbacks,
  unregisterModalCallbacks,
} from '@/utils/modalCallbackRegistry';

export const useModal = (params: ModalParams) => {
  const [visible, setVisible] = useState(false);
  const callbackIdRef = useRef<number>();

  const handleModalDismiss = useCallback(() => {
    setVisible(false);
    params.onModalDismiss();
  }, [params]);

  const handleModalButtonPress = useCallback(() => {
    setVisible(false);
    return params.onButtonPress();
  }, [params]);

  const showModal = useCallback(() => {
    if (!navigationRef.isReady()) {
      // Navigation not ready yet; avoid throwing and simply skip showing
      return;
    }
    setVisible(true);
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onButtonPress: _ignored,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onModalDismiss: _ignored2,
      ...rest
    } = params;
    const id = registerModalCallbacks({
      onButtonPress: handleModalButtonPress,
      onModalDismiss: handleModalDismiss,
    });
    callbackIdRef.current = id;
    navigationRef.navigate('Modal', { ...rest, callbackId: id });
  }, [handleModalButtonPress, handleModalDismiss, params]);

  const dismissModal = useCallback(() => {
    setVisible(false);
    if (!navigationRef.isReady()) {
      return;
    }
    const routes = navigationRef.getState()?.routes;
    if (routes?.at(routes.length - 1)?.name === 'Modal') {
      navigationRef.goBack();
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
  }, []);

  return {
    showModal,
    dismissModal,
    visible,
  };
};
