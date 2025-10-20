// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform, Vibration } from 'react-native';

import type { HapticOptions, HapticType } from './shared';
import { defaultOptions } from './shared';
/**
 * Triggers haptic feedback or vibration based on platform.
 * @param type - The haptic feedback type.
 * @param options - Custom options (optional).
 */
export const triggerFeedback = (type: HapticType | 'custom', options: HapticOptions = {}) => {
  const mergedOptions = { ...defaultOptions, ...options };

  if (Platform.OS === 'ios' && type !== 'custom') {
    if (mergedOptions.increaseIosIntensity) {
      if (type === 'impactLight') {
        type = 'impactMedium';
      } else if (type === 'impactMedium') {
        type = 'impactHeavy';
      }
    }
    // Use dynamic import to avoid loading the module on Android or if its not installed
    (async () => {
      try {
        const trigger = await import('react-native-haptic-feedback').then(mod => mod.trigger);
        trigger(type, {
          enableVibrateFallback: mergedOptions.enableVibrateFallback,
          ignoreAndroidSystemSettings: mergedOptions.ignoreAndroidSystemSettings,
        });
      } catch {
        standardVibration(mergedOptions);
      }
    })();
  } else {
    standardVibration(mergedOptions);
  }
};
function standardVibration(mergedOptions: {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
  pattern?: number[];
  increaseIosIntensity?: boolean;
}) {
  if (mergedOptions.pattern) {
    Vibration.vibrate(mergedOptions.pattern, false);
  } else {
    Vibration.vibrate(100);
  }
}
