import { Vibration } from 'react-native';

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

  if (mergedOptions.pattern) {
    Vibration.vibrate(mergedOptions.pattern, false);
  } else {
    Vibration.vibrate(100);
  }
};
