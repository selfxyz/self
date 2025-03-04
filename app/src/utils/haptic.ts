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
  androidPattern?: number[];
};

const defaultOptions: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
  androidPattern: [50, 100, 50],
};

/**
 * Haptic actions
 */
export const impactLight = (): void => triggerFeedback('impactLight');
export const impactMedium = (): void => triggerFeedback('impactMedium');
export const notificationError = (): void =>
  triggerFeedback('notificationError');
export const notificationSuccess = (): void =>
  triggerFeedback('notificationSuccess');
export const notificationWarning = (): void =>
  triggerFeedback('notificationWarning');
export const selectionChange = (): void => triggerFeedback('selection');
export const buttonTap = impactLight;
export const cancelTap = selectionChange;
export const confirmTap = impactMedium;

/**
 * Triggers haptic feedback or vibration based on platform.
 * @param type - The haptic feedback type.
 * @param options - Custom options (optional).
 */
export const triggerFeedback = (
  type: HapticType,
  options: HapticOptions = {},
): void => {
  const mergedOptions = { ...defaultOptions, ...options };

  if (Platform.OS === 'ios') {
    ReactNativeHapticFeedback.trigger(type, {
      enableVibrateFallback: mergedOptions.enableVibrateFallback,
      ignoreAndroidSystemSettings: mergedOptions.ignoreAndroidSystemSettings,
    });
  } else {
    if (mergedOptions.androidPattern) {
      Vibration.vibrate(mergedOptions.androidPattern, false);
    } else {
      Vibration.vibrate(100);
    }
  }
};
