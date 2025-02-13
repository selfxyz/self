import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';

import type { RootStackParamList } from '../Navigation';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

type NavigationAction = 'default' | 'cancel' | 'confirm';

const useHapticNavigation = <
  T extends keyof RootStackParamList,
  P extends T extends null ? never : RootStackParamList[T],
>(
  screen: T,
  options: {
    params?: P;
    action?: NavigationAction;
  } = {},
) => {
  const navigation = useNavigation();

  return useCallback(() => {
    switch (options.action) {
      case 'cancel':
        selectionChange();
        navigation.goBack();
        return;
      case 'confirm':
        impactMedium();
        break;

      case 'default':
      default:
        impactLight();
    }

    if (screen) {
      // @ts-expect-error - This actually works from outside usage, just unsure how to
      // make typescript understand that this is correct
      navigation.navigate(screen, options.params);
    }
  }, [navigation, screen, options.action]);
};

export default useHapticNavigation;
