import { Platform, Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError';

export type HapticOptions = {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
  pattern?: number[];
  increaseIosIntensity?: boolean;
};

const defaultOptions: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
  pattern: [50, 100, 50],
  increaseIosIntensity: true,
};

/**
 * Haptic actions
 */
export const impactLight = () => triggerFeedback('impactLight');
export const impactMedium = () => triggerFeedback('impactMedium');
export const notificationError = () => triggerFeedback('notificationError');
export const notificationSuccess = () => triggerFeedback('notificationSuccess');
export const notificationWarning = () => triggerFeedback('notificationWarning');
export const selectionChange = () => triggerFeedback('selection');
export const buttonTap = impactLight;
export const cancelTap = selectionChange;
export const confirmTap = impactMedium;

// Custom feedback events
// consistent light feedback at a steady interval
export const feedbackProgress = () => {
  if (Platform.OS === 'android') {
    triggerFeedback('custom', {
      pattern: [0, 50, 450, 50, 450, 50],
    });
    return;
  }

  setTimeout(() => {
    triggerFeedback('impactLight', {
      increaseIosIntensity: false,
    });
  }, 500);
  setTimeout(() => {
    triggerFeedback('impactLight', {
      increaseIosIntensity: false,
    });
  }, 1000);
  setTimeout(() => {
    triggerFeedback('impactLight', {
      increaseIosIntensity: false,
    });
  }, 1500);
};

// light -> medium -> heavy intensity in sequence
export const feedbackSuccess = () => {
  if (Platform.OS === 'android') {
    triggerFeedback('custom', {
      pattern: [500, 50, 200, 100, 150, 150],
    });
    return;
  }

  setTimeout(() => {
    triggerFeedback('impactLight', {
      increaseIosIntensity: false,
    });
  }, 500);
  setTimeout(() => {
    triggerFeedback('impactMedium', {
      increaseIosIntensity: false,
    });
  }, 750);
  setTimeout(() => {
    triggerFeedback('impactHeavy', {
      increaseIosIntensity: false,
    });
  }, 1000);
};

// heavy -> medium -> light intensity in sequence
export const feedbackUnsuccessful = () => {
  if (Platform.OS === 'android') {
    triggerFeedback('custom', {
      pattern: [500, 150, 100, 100, 150, 50],
    });
    return;
  }

  setTimeout(() => {
    triggerFeedback('impactHeavy', {
      increaseIosIntensity: false,
    });
  }, 500);
  setTimeout(() => {
    triggerFeedback('impactMedium', {
      increaseIosIntensity: false,
    });
  }, 750);
  setTimeout(() => {
    triggerFeedback('impactLight', {
      increaseIosIntensity: false,
    });
  }, 1000);
};

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
