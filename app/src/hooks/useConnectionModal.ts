import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { useModal } from '../hooks/useModal';
import { navigationRef } from '../Navigation';

const connectionModalParams = {
  titleText: 'Internet connection error',
  bodyText: 'In order to use SELF, you must have access to the internet.',
  buttonText: 'Open settings',
  onButtonPress: async () => {
    return Platform.OS === 'ios'
      ? Linking.openURL('prefs://MOBILE_DATA_SETTINGS_ID')
      : Linking.sendIntent('android.settings.WIRELESS_SETTINGS');
  },
  onModalDismiss: () => {
    // noop
  },
  preventDismiss: true,
} as const;

export default function useConnectionModal() {
  const { isInternetReachable } = useNetInfo();
  const { showModal, dismissModal, visible } = useModal(connectionModalParams);

  useEffect(() => {
    if (!navigationRef.isReady()) {
      return;
    }

    if (isInternetReachable === false && !visible) {
      showModal();
    } else if (visible && isInternetReachable !== false) {
      dismissModal();
    }
  }, [isInternetReachable, dismissModal, visible, navigationRef.isReady()]);

  return {
    visible,
  };
}
