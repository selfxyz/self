import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { checkVersion } from 'react-native-check-version';

import { AppEvents } from '../consts/analytics';
import analytics from '../utils/analytics';

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
    navigation.navigate('Modal', {
      titleText: 'New Version Available',
      bodyText:
        "We've improved performance, fixed bugs, and added new features. Update now to install the latest version of Self.",
      buttonText: 'Update and restart',
      onButtonPress: async () => {
        if (newVersionUrl !== null) {
          trackEvent(AppEvents.UPDATE_STARTED);
          // TODO or use: `Platform.OS === 'ios' ? appStoreUrl : playStoreUrl`
          await Linking.openURL(newVersionUrl);
        }
      },
      onModalDismiss: () => {
        setIsModalDismissed(true);
        trackEvent(AppEvents.UPDATE_MODAL_CLOSED);
      },
    });
    trackEvent(AppEvents.UPDATE_MODAL_OPENED);
  };

  return [newVersionUrl !== null, showAppUpdateModal, isModalDismissed];
};
