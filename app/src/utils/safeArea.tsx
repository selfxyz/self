import { PropsWithChildren, useMemo } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

export interface EdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const SafeAreaProvider = ({ children }: PropsWithChildren) => <>{children}</>;

export function useSafeAreaInsets(): EdgeInsets {
  const hasNotch = useMemo(() => {
    if (Platform.OS !== 'ios' || Platform.isPad || Platform.isTV) {
      return false;
    }
    const dimen = Dimensions.get('window');
    return dimen.height >= 812 || dimen.width >= 812;
  }, []);

  const top = useMemo(() => {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight ?? 0;
    }
    // iOS without a notch is 20, with a notch is 44
    return hasNotch ? 44 : 20;
  }, [hasNotch]);

  const bottom = useMemo(() => {
    return hasNotch ? 34 : 0;
  }, [hasNotch]);

  return useMemo(() => ({ top, bottom, left: 0, right: 0 }), [top, bottom]);
}
