import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { checkVersion } from 'react-native-check-version';

export const useAppUpdates = (): [boolean, () => void, boolean] => {
  const navigation = useNavigation();
  const [newVersionUrl, setNewVersionUrl] = useState<string | null>(null);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  useEffect(() => {
    checkVersion()
      .then(version => {
        if (version.needsUpdate) {
          setNewVersionUrl(version.url);
        }
      })
      .catch(error => {
        console.warn('Failed to check for app updates:', error);
      });
  }, []);

  const showAppUpdateModal = (): void => {
    navigation.navigate('Modal', {
      titleText: 'New Version Available',
      bodyText:
        "We've improved performance, fixed bugs, and added new features. Update now to install the latest version of Self.",
      buttonText: 'Update and restart',
      onButtonPress: async () => {
        if (newVersionUrl !== null) {
          await Linking.openURL(
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
