// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { defaultOptions, HapticOptions, HapticType } from './shared';

/**
 * Triggers haptic feedback or vibration based on platform.
 * @param type - The haptic feedback type. (only here for compatibility, not used in web)
 * @param options - Custom options (optional).
 */
export const triggerFeedback = (
  _type: HapticType | 'custom',
  options: HapticOptions = {},
) => {
  const mergedOptions = { ...defaultOptions, ...options };

  // Check if Vibration API is available
  if (!navigator.vibrate) {
    console.warn('Vibration API not supported in this browser');
    return;
  }

  if (mergedOptions.pattern) {
    navigator.vibrate(mergedOptions.pattern);
  } else {
    navigator.vibrate(100);
  }
};
