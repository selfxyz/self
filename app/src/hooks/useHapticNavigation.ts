import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';

import type { RootStackParamList } from '../Navigation';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

type NavigationAction = 'default' | 'cancel' | 'confirm';

const useHapticNavigation = (
  screen: keyof RootStackParamList,
  action: NavigationAction = 'default',
) => {
  const navigation = useNavigation();

  return useCallback(() => {
    switch (action) {
      case 'cancel':
        selectionChange();
        break;
      case 'confirm':
        impactMedium();
        break;
      default:
        impactLight();
    }
    navigation.navigate(screen);
  }, [navigation, screen, action]);
};

export default useHapticNavigation;
