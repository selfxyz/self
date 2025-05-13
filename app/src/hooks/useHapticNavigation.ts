import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { RootStackParamList } from '../Navigation';
import analytics from '../utils/analytics';
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

  const { trackEvent } = analytics();

  return useCallback(() => {
    // Get current screen for tracking context
    const currentScreen = navigation.getCurrentRoute()?.name || 'Unknown';

    // Track navigation event
    trackEvent('Navigation', {
      from_screen: currentScreen,
      to_screen: screen,
      action_type: options.action || 'default',
      has_params: options.params ? true : false,
    });

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
  }, [navigation, screen, options.action, options.params]);
};

export default useHapticNavigation;
