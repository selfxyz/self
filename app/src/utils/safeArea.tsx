// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';
import DeviceInfo from 'react-native-device-info';

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

// Enhanced Android safe area calculation
const getAndroidSafeAreaInsets = async (dimensions: {
  height: number;
  width: number;
}): Promise<{
  top: number;
  bottom: number;
  left: number;
  right: number;
}> => {
  let top = StatusBar.currentHeight ?? SAFE_AREA_INSETS.ANDROID.TOP_DEFAULT;

  try {
    const apiLevel = await DeviceInfo.getApiLevel();

    // For Android API 28+ (Android 9+), enhance the calculation
    if (apiLevel >= 28) {
      // On modern Android devices with notches/cutouts, StatusBar.currentHeight
      // usually accounts for the cutout. We can enhance this with device-specific logic.

      // Check if this might be a device with a notch based on dimensions
      const screenHeight = Math.max(dimensions.height, dimensions.width);
      const screenWidth = Math.min(dimensions.height, dimensions.width);

      // Many modern Android devices with notches have similar aspect ratios
      const aspectRatio = screenHeight / screenWidth;

      // If it's a tall device (likely modern with possible notch) and StatusBar height is minimal,
      // we might need to account for additional safe area
      if (aspectRatio > 2.0 && top < 24) {
        top = Math.max(top, 24); // Ensure minimum top inset for modern devices
      }
    }
  } catch (error) {
    console.warn('Failed to get Android API level:', error);
  }

  return {
    top,
    bottom: SAFE_AREA_INSETS.ANDROID.BOTTOM_DEFAULT,
    left: SAFE_AREA_INSETS.SIDES_DEFAULT,
    right: SAFE_AREA_INSETS.SIDES_DEFAULT,
  };
};

// iOS notch detection helper
const detectiOSNotch = (dimensions: {
  height: number;
  width: number;
}): boolean => {
  if (Platform.OS !== 'ios' || Platform.isPad || Platform.isTV) {
    return false;
  }

  const { height, width } = dimensions;
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
};

export function useSafeAreaInsets(): EdgeInsets {
  const [insets, setInsets] = useState<EdgeInsets>(() => {
    // Initial calculation
    const initialDimensions = Dimensions.get('window');
    const hasNotch = detectiOSNotch(initialDimensions);

    if (Platform.OS === 'android') {
      return {
        top: StatusBar.currentHeight ?? SAFE_AREA_INSETS.ANDROID.TOP_DEFAULT,
        bottom: SAFE_AREA_INSETS.ANDROID.BOTTOM_DEFAULT,
        left: SAFE_AREA_INSETS.SIDES_DEFAULT,
        right: SAFE_AREA_INSETS.SIDES_DEFAULT,
      };
    }

    // iOS logic
    const top = hasNotch
      ? SAFE_AREA_INSETS.iOS.TOP_WITH_NOTCH
      : SAFE_AREA_INSETS.iOS.TOP_WITHOUT_NOTCH;
    const bottom = hasNotch
      ? SAFE_AREA_INSETS.iOS.BOTTOM_WITH_NOTCH
      : SAFE_AREA_INSETS.iOS.BOTTOM_WITHOUT_NOTCH;

    return {
      top,
      bottom,
      left: SAFE_AREA_INSETS.SIDES_DEFAULT,
      right: SAFE_AREA_INSETS.SIDES_DEFAULT,
    };
  });

  useEffect(() => {
    let isSubscribed = true;

    const calculateInsets = async () => {
      if (!isSubscribed) return;

      const dimensions = Dimensions.get('window');

      if (Platform.OS === 'android') {
        const androidInsets = await getAndroidSafeAreaInsets(dimensions);
        if (isSubscribed) {
          setInsets(androidInsets);
        }
      } else {
        // iOS logic
        const hasNotch = detectiOSNotch(dimensions);
        const top = hasNotch
          ? SAFE_AREA_INSETS.iOS.TOP_WITH_NOTCH
          : SAFE_AREA_INSETS.iOS.TOP_WITHOUT_NOTCH;
        const bottom = hasNotch
          ? SAFE_AREA_INSETS.iOS.BOTTOM_WITH_NOTCH
          : SAFE_AREA_INSETS.iOS.BOTTOM_WITHOUT_NOTCH;

        if (isSubscribed) {
          setInsets({
            top,
            bottom,
            left: SAFE_AREA_INSETS.SIDES_DEFAULT,
            right: SAFE_AREA_INSETS.SIDES_DEFAULT,
          });
        }
      }
    };

    const handleDimensionChange = () => {
      calculateInsets();
    };

    // Subscribe to dimension changes
    const subscription = Dimensions.addEventListener(
      'change',
      handleDimensionChange,
    );

    // Initial calculation for Android (async)
    if (Platform.OS === 'android') {
      calculateInsets();
    }

    return () => {
      isSubscribed = false;
      subscription?.remove();
    };
  }, []);

  return insets;
}
