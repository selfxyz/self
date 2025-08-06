// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useState } from 'react';

import { AppEvents } from '../consts/analytics';
import analytics from '../utils/analytics';
import { registerModalCallbacks } from '../utils/modalCallbackRegistry';

import { useNavigation } from '@react-navigation/native';

const { trackEvent } = analytics();

export const useAppUpdates = (): [boolean, () => void, boolean] => {
  const navigation = useNavigation();
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  const showAppUpdateModal = () => {
    const callbackId = registerModalCallbacks({
      onButtonPress: async () => {
        window.location.reload();
        trackEvent(AppEvents.UPDATE_STARTED);
      },
      onModalDismiss: () => {
        setIsModalDismissed(true);
        trackEvent(AppEvents.UPDATE_MODAL_CLOSED);
      },
    });

    navigation.navigate('Modal', {
      titleText: 'New Version Available',
      bodyText:
        "We've improved performance, fixed bugs, and added new features. Update now to install the latest version of Self.",
      buttonText: 'Update and restart',
      callbackId,
    });
    trackEvent(AppEvents.UPDATE_MODAL_OPENED);
  };

  const newVersionAvailable = false;

  return [newVersionAvailable, showAppUpdateModal, isModalDismissed];
};
