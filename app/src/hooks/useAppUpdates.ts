// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { checkVersion } from 'react-native-check-version';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AppEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import type { RootStackParamList } from '@/navigation';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';

export const useAppUpdates = (): [boolean, () => void, boolean] => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [newVersionUrl, setNewVersionUrl] = useState<string | null>(null);
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const selfClient = useSelfClient();

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
          selfClient.trackEvent(AppEvents.UPDATE_STARTED);
          await Linking.openURL(newVersionUrl);
        }
      },
      onModalDismiss: () => {
        setIsModalDismissed(true);
        selfClient.trackEvent(AppEvents.UPDATE_MODAL_CLOSED);
      },
    });

    navigation.navigate('Modal', {
      titleText: 'New Version Available',
      bodyText:
        "We've improved performance, fixed bugs, and added new features. Update now to install the latest version of Self.",
      buttonText: 'Update and restart',
      callbackId,
    });
    selfClient.trackEvent(AppEvents.UPDATE_MODAL_OPENED);
  };

  return [newVersionUrl !== null, showAppUpdateModal, isModalDismissed];
};
