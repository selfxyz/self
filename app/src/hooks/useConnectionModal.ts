import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { SettingsEvents } from '../consts/analytics';
import { navigationRef } from '../navigation';
import analytics from '../utils/analytics';
import { useModal } from './useModal';

const { trackEvent } = analytics();

const connectionModalParams = {
  titleText: 'Internet connection error',
  bodyText: 'In order to use SELF, you must have access to the internet.',
  buttonText: 'Open settings',
  onButtonPress: async () => {
    trackEvent(SettingsEvents.CONNECTION_SETTINGS_OPENED);
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
        trackEvent(SettingsEvents.CONNECTION_MODAL_OPENED);
      } else if (visible && hasConnection) {
        dismissModal();
        trackEvent(SettingsEvents.CONNECTION_MODAL_CLOSED);
      }
      // Add a small delay to allow app initialization
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [hasConnection, dismissModal, visible, navigationRef.isReady()]);

  return {
    visible,
  };
}
