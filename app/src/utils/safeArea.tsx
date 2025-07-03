// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { PropsWithChildren, useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets as useRNSafeAreaInsets } from 'react-native-safe-area-context';

export interface EdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const SafeAreaProvider = ({ children }: PropsWithChildren) => (
  <>{children}</>
);

export function useSafeAreaInsets(): EdgeInsets {
  const rnSafeAreaInsets = useRNSafeAreaInsets();

  const hasNotch = useMemo(() => {
    if (Platform.OS !== 'ios' || Platform.isPad || Platform.isTV) {
      return false;
    }
    return rnSafeAreaInsets.top > 20;
  }, [rnSafeAreaInsets.top]);

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
