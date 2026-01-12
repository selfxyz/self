// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Vitest setup file for mobile-sdk-alpha tests
 * Reduces console noise during testing and mocks React Native modules
 */

import { createElement } from 'react';

const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log,
};

const shouldShowOutput = process.env.DEBUG_TESTS === 'true';

// Suppress console noise in tests unless explicitly debugging
if (!shouldShowOutput) {
  console.warn = () => {}; // Suppress warnings
  console.error = () => {}; // Suppress errors
  console.log = () => {}; // Suppress logs
}

// Restore console for debugging if needed
if (typeof global !== 'undefined') {
  (global as any).restoreConsole = () => {
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.log = originalConsole.log;
  };
}

// Mock React Native modules
vi.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj: any) => obj.web || obj.default,
  },
  NativeModules: {
    SelfMRZScannerModule: {
      startScanning: vi.fn(),
    },
    PassportReader: {
      scanPassport: vi.fn(),
    },
  },
  requireNativeComponent: vi.fn(() => 'div'),
  StyleSheet: {
    create: vi.fn(styles => styles),
    flatten: vi.fn(style => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return style.reduce((acc, s) => ({ ...acc, ...s }), {});
      }
      return style;
    }),
  },
  Image: 'div',
  Text: 'span',
  View: 'div',
  Pressable: vi.fn(({ children, style, ...props }) => {
    // Handle style as function (for pressed state)
    const computedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
    return createElement('button', { ...props, style: computedStyle }, children);
  }),
  TouchableOpacity: 'button',
  ScrollView: 'div',
  FlatList: 'div',
  TextInput: 'input',
  Switch: 'input',
  Modal: 'div',
  Alert: {
    alert: vi.fn(),
  },
  Linking: {
    openURL: vi.fn(),
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 667 })),
  },
  PixelRatio: {
    get: vi.fn(() => 2),
    getFontScale: vi.fn(() => 1),
    getPixelSizeForLayoutSize: vi.fn((size: number) => size * 2),
    roundToNearestPixel: vi.fn((size: number) => Math.round(size)),
  },
  StatusBar: {
    setBarStyle: vi.fn(),
  },
  BackHandler: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  AppState: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  PermissionsAndroid: {
    request: vi.fn(),
    PERMISSIONS: {},
    RESULTS: {},
  },
  Vibration: {
    vibrate: vi.fn(),
  },
  Clipboard: {
    setString: vi.fn(),
    getString: vi.fn(),
  },
  Share: {
    share: vi.fn(),
  },
  ToastAndroid: {
    show: vi.fn(),
  },
  Keyboard: {
    dismiss: vi.fn(),
  },
  InteractionManager: {
    runAfterInteractions: vi.fn(callback => callback()),
  },
  LayoutAnimation: {
    configureNext: vi.fn(),
  },
  UIManager: {
    measure: vi.fn(),
  },
  findNodeHandle: vi.fn(),
  createRef: vi.fn(),
  forwardRef: vi.fn(),
  useRef: vi.fn(),
  useState: vi.fn(),
  useEffect: vi.fn(),
  useCallback: vi.fn(),
  useMemo: vi.fn(),
  useImperativeHandle: vi.fn(),
  useLayoutEffect: vi.fn(),
  useReducer: vi.fn(),
  useContext: vi.fn(),
  useDebugValue: vi.fn(),
  useId: vi.fn(),
  useSyncExternalStore: vi.fn(),
  useTransition: vi.fn(),
  useDeferredValue: vi.fn(),
  useInsertionEffect: vi.fn(),
  Children: {
    map: vi.fn(),
    forEach: vi.fn(),
    count: vi.fn(),
    toArray: vi.fn(),
    only: vi.fn(),
  },
  cloneElement: vi.fn(),
  isValidElement: vi.fn(),
  createElement: vi.fn(),
  Fragment: 'div',
  StrictMode: 'div',
  Suspense: 'div',
  createContext: vi.fn(),
  lazy: vi.fn(),
  memo: vi.fn(),
  startTransition: vi.fn(),
  use: vi.fn(),
  cache: vi.fn(),
  experimental_use: vi.fn(),
  experimental_useOptimistic: vi.fn(),
  experimental_useActionState: vi.fn(),
  experimental_useFormStatus: vi.fn(),
  experimental_useFormState: vi.fn(),
  experimental_useCacheRefresh: vi.fn(),
}));

// Mock window.matchMedia for Tamagui components
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock react-native-localize
vi.mock('react-native-localize', () => ({
  getLocales: vi.fn().mockReturnValue([
    {
      countryCode: 'US',
      languageTag: 'en-US',
      languageCode: 'en',
      isRTL: false,
    },
  ]),
  getCountry: vi.fn().mockReturnValue('US'),
  getTimeZone: vi.fn().mockReturnValue('America/New_York'),
  getCurrencies: vi.fn().mockReturnValue(['USD']),
  getTemperatureUnit: vi.fn().mockReturnValue('celsius'),
  getFirstWeekDay: vi.fn().mockReturnValue(0),
  uses24HourClock: vi.fn().mockReturnValue(false),
  usesMetricSystem: vi.fn().mockReturnValue(false),
  findBestAvailableLanguage: vi.fn().mockReturnValue({
    languageTag: 'en-US',
    isRTL: false,
  }),
}));

// Mock react-native-svg
vi.mock('react-native-svg', () => ({
  default: 'svg',
  Svg: 'svg',
  Circle: 'circle',
  Ellipse: 'ellipse',
  G: 'g',
  Text: 'text',
  TSpan: 'tspan',
  TextPath: 'textPath',
  Path: 'path',
  Polygon: 'polygon',
  Polyline: 'polyline',
  Line: 'line',
  Rect: 'rect',
  Use: 'use',
  Image: 'image',
  Symbol: 'symbol',
  Defs: 'defs',
  LinearGradient: 'linearGradient',
  RadialGradient: 'radialGradient',
  Stop: 'stop',
  ClipPath: 'clipPath',
  Pattern: 'pattern',
  Mask: 'mask',
}));

// Mock react-native-svg-circle-country-flags
vi.mock('react-native-svg-circle-country-flags', () => ({
  default: {},
}));

// Mock lottie-react-native
vi.mock('lottie-react-native', () => ({
  default: 'div',
}));

// Mock react-native-haptic-feedback
vi.mock('react-native-haptic-feedback', () => ({
  default: {
    trigger: vi.fn(),
  },
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
    selection: 'selection',
  },
}));
