// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import type { HapticOptions, HapticType } from '@/utils/haptic/shared';
import { defaultOptions } from '@/utils/haptic/shared';
/**
 * Triggers haptic feedback or vibration based on platform.
 * @param type - The haptic feedback type.
 * @param options - Custom options (optional).
 */
export const triggerFeedback = (
  type: HapticType | 'custom',
  options: HapticOptions = {},
) => {
  const mergedOptions = { ...defaultOptions, ...options };
  if (Platform.OS === 'ios' && type !== 'custom') {
    if (mergedOptions.increaseIosIntensity) {
      if (type === 'impactLight') {
        type = 'impactMedium';
      } else if (type === 'impactMedium') {
        type = 'impactHeavy';
      }
    }

    ReactNativeHapticFeedback.trigger(type, {
      enableVibrateFallback: mergedOptions.enableVibrateFallback,
      ignoreAndroidSystemSettings: mergedOptions.ignoreAndroidSystemSettings,
    });
  } else {
    if (mergedOptions.pattern) {
      Vibration.vibrate(mergedOptions.pattern, false);
    } else {
      Vibration.vibrate(100);
    }
  }
};
