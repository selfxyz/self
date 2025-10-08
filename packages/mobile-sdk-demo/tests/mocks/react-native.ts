export const AccessibilityInfo = {
  announceForAccessibility: () => Promise.resolve(),
};

export const ActivityIndicator = () => null;
export const Alert = { alert: () => undefined };

export const PermissionsAndroid = {
  PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
  RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  request: async () => 'granted' as const,
};

export const Platform = {
  OS: 'ios',
  select<T>(mapping: Record<string, T> & { default?: T }): T {
    if (Object.prototype.hasOwnProperty.call(mapping, 'ios')) {
      return mapping.ios as T;
    }
    if (Object.prototype.hasOwnProperty.call(mapping, 'default')) {
      return mapping.default as T;
    }
    return Object.values(mapping)[0] as T;
  },
};

export const StyleSheet = {
  create: <T extends Record<string, object>>(styles: T) => styles,
};

export const Text = () => null;
export const TouchableOpacity = () => null;
export const View = () => null;

export default {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
};
