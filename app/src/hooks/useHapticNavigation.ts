import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';

import type { RootStackParamList } from '../Navigation';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

type NavigationAction = 'default' | 'cancel' | 'confirm';

const useHapticNavigation = (
  screen: keyof RootStackParamList | null,
  action: NavigationAction = 'default',
) => {
  const navigation = useNavigation();

  if (screen === null && action !== 'cancel') {
    throw new Error('Only cancel actions can have null screens');
  }

  return useCallback(() => {
    switch (action) {
      case 'cancel':
        selectionChange();
        navigation.goBack();
        return;
      case 'confirm':
        impactMedium();
        break;
      default:
        impactLight();
    }
    if (screen) {
      navigation.navigate(screen);
    }
  }, [navigation, screen, action]);
};

export default useHapticNavigation;
