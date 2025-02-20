import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../Navigation';
import { impactLight, impactMedium, selectionChange } from '../utils/haptic';

type NavigationAction = 'default' | 'cancel' | 'confirm';

const useHapticNavigation = <S extends keyof RootStackParamList>(
  screen: S,
  options: {
    params?: RootStackParamList[S];
    action?: NavigationAction;
  } = {},
) => {
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];

  return useCallback(() => {
    switch (options.action) {
      case 'cancel':
        selectionChange();
        // it is safe to cast options.params as any because it is correct when entering the function
        navigation.popTo(screen, options.params as any);
        return;

      case 'confirm':
        impactMedium();
        break;

      case 'default':
      default:
        impactLight();
    }
    // it is safe to cast options.params as any because it is correct when entering the function
    navigation.navigate(screen, options.params as any);
  }, [navigation, screen, options.action]);
};

export default useHapticNavigation;
