import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { navigationRef } from '../navigation';
import { useModal } from './useModal';

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
  const { isConnected, isInternetReachable } = useNetInfo();
  const { showModal, dismissModal, visible } = useModal(connectionModalParams);
  const hasConnection = isInternetReachable === true && isConnected === true;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!navigationRef.isReady()) {
        return;
      }

      if (!hasConnection && !visible) {
        showModal();
      } else if (visible && hasConnection) {
        dismissModal();
      }
      // Add a small delay to allow app initialization
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [hasConnection, dismissModal, visible, navigationRef.isReady()]);

  return {
    visible,
  };
}
