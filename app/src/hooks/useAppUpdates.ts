import { useState } from 'react';
import { Linking } from 'react-native';
import { checkVersion } from 'react-native-check-version';

import { useNavigation } from '@react-navigation/native';

export const useAppUpdates = (): [boolean, () => void, boolean] => {
  const navigation = useNavigation();
  const [newVersionUrl, setNewVersionUrl] = useState<string | null>(null);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  checkVersion().then(version => {
    if (version.needsUpdate) {
      setNewVersionUrl(version.url);
    }
  });

  const showAppUpdateModal = () => {
    navigation.navigate('Modal', {
      titleText: 'New Version Available',
      bodyText:
        "We've improved performance, fixed bugs, and added new features. Update now to install the latest version of Self.",
      buttonText: 'Update and restart',
      onButtonPress: () => {
        if (newVersionUrl !== null) {
          Linking.openURL(
            newVersionUrl, // TODO or use: `Platform.OS === 'ios' ? appStoreUrl : playStoreUrl`
          );
        }
      },
      onModalDismiss: () => {
        setIsModalDismissed(true);
      },
    });
  };

  return [newVersionUrl !== null, showAppUpdateModal, isModalDismissed];
};
