// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { PropsWithChildren, useMemo } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

// Safe area constants
const SAFE_AREA_INSETS = {
  iOS: {
    TOP_WITH_NOTCH: 44,
    TOP_WITHOUT_NOTCH: 20,
    BOTTOM_WITH_NOTCH: 34,
    BOTTOM_WITHOUT_NOTCH: 0,
  },
  ANDROID: {
    TOP_DEFAULT: 0,
    BOTTOM_DEFAULT: 0,
  },
  SIDES_DEFAULT: 0,
} as const;

// Device dimensions for notch detection
const NOTCH_DETECTION_DIMENSIONS = {
  // iPhone X, XS, XR, 11, 12, 13, 14, 15 series and newer
  STANDARD_NOTCH: {
    MIN_HEIGHT: 812,
    MIN_WIDTH: 375,
  },
  // iPhone 14 Plus, 15 Plus series
  PLUS_SERIES: {
    MIN_HEIGHT: 896,
    MIN_WIDTH: 414,
  },
  // iPhone Pro Max series
  PRO_MAX_SERIES: {
    MIN_HEIGHT: 926,
    MIN_WIDTH: 428,
  },
} as const;

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
  const hasNotch = useMemo(() => {
    if (Platform.OS !== 'ios' || Platform.isPad || Platform.isTV) {
      return false;
    }

    const { height, width } = Dimensions.get('window');
    const screenHeight = Math.max(height, width);
    const screenWidth = Math.min(height, width);

    // More comprehensive notch detection for iOS devices
    // iPhone X, XS, XR, 11, 12, 13, 14, 15 series and newer
    if (
      screenHeight >= NOTCH_DETECTION_DIMENSIONS.STANDARD_NOTCH.MIN_HEIGHT &&
      screenWidth >= NOTCH_DETECTION_DIMENSIONS.STANDARD_NOTCH.MIN_WIDTH
    ) {
      return true;
    }

    // iPhone 14 Plus, 15 Plus series
    if (
      screenHeight >= NOTCH_DETECTION_DIMENSIONS.PLUS_SERIES.MIN_HEIGHT &&
      screenWidth >= NOTCH_DETECTION_DIMENSIONS.PLUS_SERIES.MIN_WIDTH
    ) {
      return true;
    }

    // iPhone Pro Max series
    if (
      screenHeight >= NOTCH_DETECTION_DIMENSIONS.PRO_MAX_SERIES.MIN_HEIGHT &&
      screenWidth >= NOTCH_DETECTION_DIMENSIONS.PRO_MAX_SERIES.MIN_WIDTH
    ) {
      return true;
    }

    return false;
  }, []);

  const top = useMemo(() => {
    if (Platform.OS === 'android') {
      return StatusBar.currentHeight ?? SAFE_AREA_INSETS.ANDROID.TOP_DEFAULT;
    }
    // iOS without a notch is 20, with a notch is 44
    return hasNotch
      ? SAFE_AREA_INSETS.iOS.TOP_WITH_NOTCH
      : SAFE_AREA_INSETS.iOS.TOP_WITHOUT_NOTCH;
  }, [hasNotch]);

  const bottom = useMemo(() => {
    return hasNotch
      ? SAFE_AREA_INSETS.iOS.BOTTOM_WITH_NOTCH
      : SAFE_AREA_INSETS.iOS.BOTTOM_WITHOUT_NOTCH;
  }, [hasNotch]);

  return useMemo(
    () => ({
      top,
      bottom,
      left: SAFE_AREA_INSETS.SIDES_DEFAULT,
      right: SAFE_AREA_INSETS.SIDES_DEFAULT,
    }),
    [top, bottom],
  );
}
