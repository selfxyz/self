// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { PropsWithChildren, useMemo } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

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
  const hasNotch = (() => {
    if (Platform.OS !== 'ios' || Platform.isPad || Platform.isTV) {
      return false;
    }

    const { height, width } = Dimensions.get('window');
    const screenHeight = Math.max(height, width);
    const screenWidth = Math.min(height, width);

    // More comprehensive notch detection for iOS devices
    // iPhone X, XS, XR, 11, 12, 13, 14, 15 series and newer
    if (screenHeight >= 812 && screenWidth >= 375) {
      return true;
    }

    // iPhone 14 Plus, 15 Plus series
    if (screenHeight >= 896 && screenWidth >= 414) {
      return true;
    }

    // iPhone Pro Max series
    if (screenHeight >= 926 && screenWidth >= 428) {
      return true;
    }

    return false;
  })();

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
