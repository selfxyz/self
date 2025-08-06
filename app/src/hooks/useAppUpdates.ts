// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { checkVersion } from 'react-native-check-version';

import { AppEvents } from '../consts/analytics';
import analytics from '../utils/analytics';
import { registerModalCallbacks } from '../utils/modalCallbackRegistry';

import { useNavigation } from '@react-navigation/native';

const { trackEvent } = analytics();

export const useAppUpdates = (): [boolean, () => void, boolean] => {
  const navigation = useNavigation();
  const [newVersionUrl, setNewVersionUrl] = useState<string | null>(null);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  useEffect(() => {
    checkVersion().then(version => {
      if (version.needsUpdate) {
        setNewVersionUrl(version.url);
      }
    });
  }, []);

  const showAppUpdateModal = () => {
    const callbackId = registerModalCallbacks({
      onButtonPress: async () => {
        if (newVersionUrl !== null) {
          trackEvent(AppEvents.UPDATE_STARTED);
          await Linking.openURL(newVersionUrl);
        }
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

  return [newVersionUrl !== null, showAppUpdateModal, isModalDismissed];
};
