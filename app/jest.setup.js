// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* global jest */
/** @jest-environment jsdom */

// Mock React Native PixelRatio globally before anything else loads
const mockPixelRatio = {
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn(layoutSize => layoutSize * 2),
  roundToNearestPixel: jest.fn(layoutSize => Math.round(layoutSize * 2) / 2),
  startDetecting: jest.fn(),
};

global.PixelRatio = mockPixelRatio;

// Also make it available for require() calls
const Module = require('module');

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'react-native') {
    const RN = originalRequire.apply(this, arguments);
    if (!RN.PixelRatio || !RN.PixelRatio.getFontScale) {
      RN.PixelRatio = mockPixelRatio;
    }
    return RN;
  }
  return originalRequire.apply(this, arguments);
};

require('react-native-gesture-handler/jestSetup');

// Mock NativeAnimatedHelper - using virtual mock during RN 0.76.9 prep phase
jest.mock(
  'react-native/src/private/animated/NativeAnimatedHelper',
  () => ({}),
  { virtual: true },
);

// Mock React Native bridge config for mobile-sdk-alpha components
global.__fbBatchedBridgeConfig = {
  messageQueue: {
    SPY_MODE: false,
  },
  remoteModuleConfig: [],
};

// Set up global React Native test environment
global.__DEV__ = true;

// Mock TurboModuleRegistry to provide required native modules for BOTH main app and mobile-sdk-alpha
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(name => {
    if (name === 'PlatformConstants') {
      return {
        getConstants: () => ({
          reactNativeVersion: { major: 0, minor: 76, patch: 9 },
          forceTouchAvailable: false,
          osVersion: '14.0',
          systemName: 'iOS',
          interfaceIdiom: 'phone',
          Dimensions: {
            window: { width: 375, height: 667, scale: 2 },
            screen: { width: 375, height: 667, scale: 2 },
          },
        }),
      };
    }
    if (name === 'SettingsManager') {
      return {
        getConstants: () => ({}),
      };
    }
    if (name === 'DeviceInfo') {
      return {
        getConstants: () => ({
          Dimensions: {
            window: { width: 375, height: 667, scale: 2 },
            screen: { width: 375, height: 667, scale: 2 },
          },
        }),
      };
    }
    if (name === 'RNDeviceInfo') {
      return {
        getConstants: () => ({
          Dimensions: {
            window: { width: 375, height: 667, scale: 2 },
            screen: { width: 375, height: 667, scale: 2 },
          },
        }),
      };
    }
    return {
      getConstants: () => ({}),
    };
  }),
  get: jest.fn(() => null),
}));

// Mock main React Native PixelRatio module
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => ({
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn(layoutSize => layoutSize * 2),
  roundToNearestPixel: jest.fn(layoutSize => Math.round(layoutSize * 2) / 2),
  startDetecting: jest.fn(),
}));

// Mock mobile-sdk-alpha to use the main React Native instance instead of its own
jest.mock(
  '../packages/mobile-sdk-alpha/node_modules/react-native',
  () => {
    // Create the PixelRatio mock first
    const PixelRatio = {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn(layoutSize => layoutSize * 2),
      roundToNearestPixel: jest.fn(
        layoutSize => Math.round(layoutSize * 2) / 2,
      ),
      startDetecting: jest.fn(),
    };

    const RN = jest.requireActual('react-native');
    // Override the PixelRatio immediately
    RN.PixelRatio = PixelRatio;

    // Make sure both the default and named exports work
    const mockedRN = {
      ...RN,
      PixelRatio,
      default: {
        ...RN,
        PixelRatio,
      },
    };

    return mockedRN;
  },
  { virtual: true },
);

// Mock @turnkey/react-native-wallet-kit to prevent loading of problematic dependencies
jest.mock(
  '@turnkey/react-native-wallet-kit',
  () => ({
    AuthState: {
      Authenticated: 'Authenticated',
      Unauthenticated: 'Unauthenticated',
    },
    useTurnkey: jest.fn(() => ({
      handleGoogleOauth: jest.fn(),
      fetchWallets: jest.fn().mockResolvedValue([]),
      exportWallet: jest.fn(),
      importWallet: jest.fn(),
      authState: 'Unauthenticated',
      logout: jest.fn(),
    })),
    TurnkeyProvider: ({ children }) => children,
  }),
  { virtual: true },
);

// Mock the mobile-sdk-alpha's TurboModuleRegistry to prevent native module errors
jest.mock(
  '../packages/mobile-sdk-alpha/node_modules/react-native/Libraries/TurboModule/TurboModuleRegistry',
  () => ({
    getEnforcing: jest.fn(name => {
      if (name === 'PlatformConstants') {
        return {
          getConstants: () => ({
            reactNativeVersion: { major: 0, minor: 76, patch: 9 },
            forceTouchAvailable: false,
            osVersion: '14.0',
            systemName: 'iOS',
            interfaceIdiom: 'phone',
            Dimensions: {
              window: { width: 375, height: 667, scale: 2 },
              screen: { width: 375, height: 667, scale: 2 },
            },
          }),
        };
      }
      return {
        getConstants: () => ({}),
      };
    }),
    get: jest.fn(() => null),
  }),
  { virtual: true },
);

// Mock mobile-sdk-alpha's Dimensions module
jest.mock(
  '../packages/mobile-sdk-alpha/node_modules/react-native/Libraries/Utilities/Dimensions',
  () => ({
    getConstants: jest.fn(() => ({
      window: { width: 375, height: 667, scale: 2 },
      screen: { width: 375, height: 667, scale: 2 },
    })),
    set: jest.fn(),
    get: jest.fn(() => ({
      window: { width: 375, height: 667, scale: 2 },
      screen: { width: 375, height: 667, scale: 2 },
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),
  { virtual: true },
);

// Mock mobile-sdk-alpha's PixelRatio module directly since it's still needed by StyleSheet
jest.mock(
  '../packages/mobile-sdk-alpha/node_modules/react-native/Libraries/Utilities/PixelRatio',
  () => ({
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn(layoutSize => layoutSize * 2),
    roundToNearestPixel: jest.fn(layoutSize => Math.round(layoutSize * 2) / 2),
    startDetecting: jest.fn(),
  }),
  { virtual: true },
);

// Mock mobile-sdk-alpha's StyleSheet module directly since it's still needed
jest.mock(
  '../packages/mobile-sdk-alpha/node_modules/react-native/Libraries/StyleSheet/StyleSheet',
  () => ({
    create: jest.fn(styles => styles),
    flatten: jest.fn(style => style),
    hairlineWidth: 1,
    absoluteFillObject: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    roundToNearestPixel: jest.fn(layoutSize => Math.round(layoutSize * 2) / 2),
  }),
  { virtual: true },
);

// Mock main React Native StyleSheet module
jest.mock('react-native/Libraries/StyleSheet/StyleSheet', () => ({
  create: jest.fn(styles => styles),
  flatten: jest.fn(style => style),
  hairlineWidth: 1,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  roundToNearestPixel: jest.fn(layoutSize => Math.round(layoutSize * 2) / 2),
}));

// Mock NativeDeviceInfo specs for both main app and mobile-sdk-alpha
jest.mock('react-native/src/private/specs/modules/NativeDeviceInfo', () => ({
  getConstants: jest.fn(() => ({
    Dimensions: {
      window: { width: 375, height: 667, scale: 2 },
      screen: { width: 375, height: 667, scale: 2 },
    },
  })),
}));

// Mock NativeStatusBarManagerIOS for react-native-edge-to-edge SystemBars
jest.mock(
  'react-native/src/private/specs/modules/NativeStatusBarManagerIOS',
  () => ({
    setStyle: jest.fn(),
    setHidden: jest.fn(),
    setNetworkActivityIndicatorVisible: jest.fn(),
  }),
);

// Mock react-native-gesture-handler to prevent getConstants errors
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');

  // Mock the components directly without requiring react-native
  // to avoid triggering hermes-parser WASM errors
  const MockScrollView = props =>
    React.createElement('ScrollView', props, props.children);
  const MockTouchableOpacity = props =>
    React.createElement('TouchableOpacity', props, props.children);
  const MockTouchableHighlight = props =>
    React.createElement('TouchableHighlight', props, props.children);
  const MockFlatList = props => React.createElement('FlatList', props);

  return {
    ...jest.requireActual('react-native-gesture-handler/jestSetup'),
    GestureHandlerRootView: ({ children }) => children,
    ScrollView: MockScrollView,
    TouchableOpacity: MockTouchableOpacity,
    TouchableHighlight: MockTouchableHighlight,
    FlatList: MockFlatList,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    SafeAreaProvider: ({ children }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock NativeEventEmitter to prevent null argument errors
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  function MockNativeEventEmitter(nativeModule) {
    // Accept any nativeModule argument (including null/undefined)
    this.nativeModule = nativeModule;
    this.addListener = jest.fn();
    this.removeListener = jest.fn();
    this.removeAllListeners = jest.fn();
    this.emit = jest.fn();
  }

  // The mock needs to be the constructor itself, not wrapped
  MockNativeEventEmitter.default = MockNativeEventEmitter;
  return MockNativeEventEmitter;
});

// Mock react-native-device-info to prevent NativeEventEmitter errors
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn().mockResolvedValue('mock-device-id'),
  getReadableVersion: jest.fn().mockReturnValue('1.0.0'),
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  getBuildNumber: jest.fn().mockReturnValue('1'),
  getModel: jest.fn().mockReturnValue('mock-model'),
  getBrand: jest.fn().mockReturnValue('mock-brand'),
  isTablet: jest.fn().mockReturnValue(false),
  isLandscape: jest.fn().mockResolvedValue(false),
  getSystemVersion: jest.fn().mockReturnValue('14.0'),
  getSystemName: jest.fn().mockReturnValue('iOS'),
  default: {
    getUniqueId: jest.fn().mockResolvedValue('mock-device-id'),
    getReadableVersion: jest.fn().mockReturnValue('1.0.0'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getBuildNumber: jest.fn().mockReturnValue('1'),
    getModel: jest.fn().mockReturnValue('mock-model'),
    getBrand: jest.fn().mockReturnValue('mock-brand'),
    isTablet: jest.fn().mockReturnValue(false),
    isLandscape: jest.fn().mockResolvedValue(false),
    getSystemVersion: jest.fn().mockReturnValue('14.0'),
    getSystemName: jest.fn().mockReturnValue('iOS'),
  },
}));

// Mock react-native-device-info nested in @turnkey/react-native-wallet-kit
jest.mock(
  'node_modules/@turnkey/react-native-wallet-kit/node_modules/react-native-device-info',
  () => ({
    getUniqueId: jest.fn().mockResolvedValue('mock-device-id'),
    getReadableVersion: jest.fn().mockReturnValue('1.0.0'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    getBuildNumber: jest.fn().mockReturnValue('1'),
    getModel: jest.fn().mockReturnValue('mock-model'),
    getBrand: jest.fn().mockReturnValue('mock-brand'),
    isTablet: jest.fn().mockReturnValue(false),
    isLandscape: jest.fn().mockResolvedValue(false),
    getSystemVersion: jest.fn().mockReturnValue('14.0'),
    getSystemName: jest.fn().mockReturnValue('iOS'),
    default: {
      getUniqueId: jest.fn().mockResolvedValue('mock-device-id'),
      getReadableVersion: jest.fn().mockReturnValue('1.0.0'),
      getVersion: jest.fn().mockReturnValue('1.0.0'),
      getBuildNumber: jest.fn().mockReturnValue('1'),
      getModel: jest.fn().mockReturnValue('mock-model'),
      getBrand: jest.fn().mockReturnValue('mock-brand'),
      isTablet: jest.fn().mockReturnValue(false),
      isLandscape: jest.fn().mockResolvedValue(false),
      getSystemVersion: jest.fn().mockReturnValue('14.0'),
      getSystemName: jest.fn().mockReturnValue('iOS'),
    },
  }),
  { virtual: true },
);

// Mock problematic mobile-sdk-alpha components that use React Native StyleSheet
jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  NFCScannerScreen: jest.fn(() => null),
  SelfClientProvider: jest.fn(({ children }) => children),
  useSelfClient: jest.fn(() => {
    // Create a consistent mock instance for memoization testing
    if (!global.mockSelfClientInstance) {
      global.mockSelfClientInstance = {
        // Mock selfClient object with common methods
        connect: jest.fn(),
        disconnect: jest.fn(),
        isConnected: false,
        extractMRZInfo: jest.fn(mrzString => {
          // Mock extractMRZInfo with realistic behavior
          if (!mrzString || typeof mrzString !== 'string') {
            throw new Error('Invalid MRZ string provided');
          }

          // Valid MRZ example from the test
          if (mrzString.includes('L898902C3')) {
            return {
              documentNumber: 'L898902C3',
              validation: {
                overall: true,
              },
              // Add other expected MRZ fields
              firstName: 'ANNA',
              lastName: 'ERIKSSON',
              nationality: 'UTO',
              dateOfBirth: '740812',
              sex: 'F',
              expirationDate: '120415',
            };
          }

          // For malformed/invalid MRZ strings, throw an error
          throw new Error('Invalid MRZ format');
        }),
        trackEvent: jest.fn(),
      };
    }
    return global.mockSelfClientInstance;
  }),
  createSelfClient: jest.fn(() => ({
    // Mock createSelfClient return value
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: false,
    extractMRZInfo: jest.fn(mrzString => {
      // Mock extractMRZInfo with realistic behavior
      if (!mrzString || typeof mrzString !== 'string') {
        throw new Error('Invalid MRZ string provided');
      }

      // Valid MRZ example from the test
      if (mrzString.includes('L898902C3')) {
        return {
          documentNumber: 'L898902C3',
          validation: {
            overall: true,
          },
          // Add other expected MRZ fields
          firstName: 'ANNA',
          lastName: 'ERIKSSON',
          nationality: 'UTO',
          dateOfBirth: '740812',
          sex: 'F',
          expirationDate: '120415',
        };
      }

      // For malformed/invalid MRZ strings, throw an error
      throw new Error('Invalid MRZ format');
    }),
    trackEvent: jest.fn(),
  })),
  createListenersMap: jest.fn(() => ({
    // Mock createListenersMap return value
    map: new Map(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  isPassportDataValid: jest.fn((data, callbacks) => {
    // Mock validation function with realistic behavior
    if (!data || !data.passportMetadata) {
      // Call appropriate callbacks for missing data
      if (callbacks?.onPassportMetadataNull) {
        callbacks.onPassportMetadataNull();
      }
      return false;
    }
    // Return true for valid data, false for invalid
    return data.valid !== false;
  }),
  SdkEvents: {
    // Mock SDK events object
    PROVING_PASSPORT_DATA_NOT_FOUND: 'PROVING_PASSPORT_DATA_NOT_FOUND',
    PROVING_STARTED: 'PROVING_STARTED',
    PROVING_COMPLETED: 'PROVING_COMPLETED',
    PROVING_FAILED: 'PROVING_FAILED',
    // Add other events as needed
  },
  // Mock haptic functions
  buttonTap: jest.fn(),
  cancelTap: jest.fn(),
  confirmTap: jest.fn(),
  feedbackProgress: jest.fn(),
  feedbackSuccess: jest.fn(),
  feedbackUnsuccessful: jest.fn(),
  impactLight: jest.fn(),
  impactMedium: jest.fn(),
  loadingScreenProgress: jest.fn(),
  notificationError: jest.fn(),
  notificationSuccess: jest.fn(),
  notificationWarning: jest.fn(),
  selectionChange: jest.fn(),
  triggerFeedback: jest.fn(),
  // Add other components and hooks as needed
}));

// Mock Sentry to prevent NativeModule.getConstants errors
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureFeedback: jest.fn(),
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  setExtra: jest.fn(),
  setTag: jest.fn(),
  setUser: jest.fn(),
  init: jest.fn(),
  wrap: jest.fn(component => component),
  withScope: jest.fn(callback => {
    // Mock scope object
    const scope = {
      setLevel: jest.fn(),
      setTag: jest.fn(),
      setExtra: jest.fn(),
      setContext: jest.fn(),
      setUser: jest.fn(),
    };
    callback(scope);
  }),
}));

jest.mock('@env', () => ({
  ENABLE_DEBUG_LOGS: 'false',
  MIXPANEL_NFC_PROJECT_TOKEN: 'test-token',
}));

global.FileReader = class {
  constructor() {
    this.onload = null;
  }
  readAsArrayBuffer() {
    if (this.onload) {
      this.onload({ target: { result: new ArrayBuffer(0) } });
    }
  }
};

jest.mock('@react-native-firebase/messaging', () => {
  return () => ({
    hasPermission: jest.fn(() => Promise.resolve(true)),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    getToken: jest.fn(() => Promise.resolve('mock-token')),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    setBackgroundMessageHandler: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
    subscribeToTopic: jest.fn(),
    unsubscribeFromTopic: jest.fn(),
  });
});

jest.mock('@react-native-firebase/remote-config', () => {
  const mockValue = { asBoolean: jest.fn(() => false) };
  const mockConfig = {
    setDefaults: jest.fn(),
    setConfigSettings: jest.fn(),
    fetchAndActivate: jest.fn(() => Promise.resolve(true)),
    getValue: jest.fn(() => mockValue),
  };
  return () => mockConfig;
});

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock Segment Analytics
jest.mock('@segment/analytics-react-native', () => {
  const mockClient = {
    add: jest.fn(),
    track: jest.fn(),
    identify: jest.fn(),
    screen: jest.fn(),
    group: jest.fn(),
    alias: jest.fn(),
    reset: jest.fn(),
  };

  // Mock flush policy classes
  const MockFlushPolicy = class {
    constructor() {}
  };

  return {
    createClient: jest.fn(() => mockClient),
    EventPlugin: jest.fn(),
    PluginType: {
      ENRICHMENT: 'enrichment',
      DESTINATION: 'destination',
      BEFORE: 'before',
      before: 'before',
    },
    StartupFlushPolicy: MockFlushPolicy,
    BackgroundFlushPolicy: MockFlushPolicy,
  };
});

// Note: @selfxyz/mobile-sdk-alpha is NOT mocked to allow testing real package methods
// This is intentional for the mobile-sdk-alpha migration testing

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
  SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
  SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
    AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
    ALWAYS: 'AccessibleAlways',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY:
      'AccessibleWhenPasscodeSetThisDeviceOnly',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:
      'AccessibleAfterFirstUnlockThisDeviceOnly',
    ALWAYS_THIS_DEVICE_ONLY: 'AccessibleAlwaysThisDeviceOnly',
  },
  ACCESS_CONTROL: {
    USER_PRESENCE: 'UserPresence',
    BIOMETRY_ANY: 'BiometryAny',
    BIOMETRY_CURRENT_SET: 'BiometryCurrentSet',
    DEVICE_PASSCODE: 'DevicePasscode',
    APPLICATION_PASSWORD: 'ApplicationPassword',
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode',
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE:
      'BiometryCurrentSetOrDevicePasscode',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  flushGetRequests: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  multiMerge: jest.fn(),
}));

// Mock react-native-check-version
jest.mock('react-native-check-version', () => ({
  checkVersion: jest.fn().mockResolvedValue({
    needsUpdate: false,
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
  }),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn().mockReturnValue({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      cellularGeneration: '4g',
    },
  }),
  fetch: jest
    .fn()
    .mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

// Mock react-native-nfc-manager
jest.mock('react-native-nfc-manager', () => ({
  start: jest.fn(),
  isSupported: jest.fn().mockResolvedValue(true),
  isEnabled: jest.fn().mockResolvedValue(true),
  registerTagEvent: jest.fn(),
  unregisterTagEvent: jest.fn(),
  requestTechnology: jest.fn(),
  cancelTechnologyRequest: jest.fn(),
  getTag: jest.fn(),
  setAlertMessage: jest.fn(),
  sendMifareCommand: jest.fn(),
  sendCommandAPDU: jest.fn(),
  transceive: jest.fn(),
  getMaxTransceiveLength: jest.fn(),
  setTimeout: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
  cleanUpTag: jest.fn(),
  default: {
    start: jest.fn(),
    isSupported: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockResolvedValue(true),
    registerTagEvent: jest.fn(),
    unregisterTagEvent: jest.fn(),
    requestTechnology: jest.fn(),
    cancelTechnologyRequest: jest.fn(),
    getTag: jest.fn(),
    setAlertMessage: jest.fn(),
    sendMifareCommand: jest.fn(),
    sendCommandAPDU: jest.fn(),
    transceive: jest.fn(),
    getMaxTransceiveLength: jest.fn(),
    setTimeout: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
    cleanUpTag: jest.fn(),
  },
}));

// Mock react-native-passport-reader
jest.mock('react-native-passport-reader', () => {
  const mockScanPassport = jest.fn();
  // Mock the parameter count for scanPassport (iOS native method takes 9 parameters)
  Object.defineProperty(mockScanPassport, 'length', { value: 9 });

  const mockPassportReader = {
    configure: jest.fn(),
    scanPassport: mockScanPassport,
    readPassport: jest.fn(),
    cancelPassportRead: jest.fn(),
    trackEvent: jest.fn(),
    flush: jest.fn(),
    reset: jest.fn(),
  };

  return {
    PassportReader: mockPassportReader,
    default: mockPassportReader,
    reset: jest.fn(),
    scan: jest.fn(),
  };
});

const { NativeModules } = require('react-native');

NativeModules.PassportReader = {
  configure: jest.fn(),
  scanPassport: jest.fn(),
  trackEvent: jest.fn(),
  flush: jest.fn(),
  reset: jest.fn(),
};

// Mock @/utils/passportReader to properly expose the interface expected by tests
jest.mock('./src/utils/passportReader', () => {
  const mockScanPassport = jest.fn();
  // Mock the parameter count for scanPassport (iOS native method takes 9 parameters)
  Object.defineProperty(mockScanPassport, 'length', { value: 9 });

  const mockPassportReader = {
    configure: jest.fn(),
    scanPassport: mockScanPassport,
    trackEvent: jest.fn(),
    flush: jest.fn(),
    reset: jest.fn(),
  };

  return {
    PassportReader: mockPassportReader,
    reset: jest.fn(),
    scan: jest.fn(),
    default: mockPassportReader,
  };
});

// Mock @stablelib packages
jest.mock('@stablelib/cbor', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('@stablelib/utf8', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

// Mock react-native-app-auth
jest.mock('react-native-app-auth', () => ({
  authorize: jest.fn().mockResolvedValue({ accessToken: 'mock-access-token' }),
}));

// Mock @robinbobin/react-native-google-drive-api-wrapper
jest.mock('@robinbobin/react-native-google-drive-api-wrapper', () => {
  class MockUploader {
    setData() {
      return this;
    }
    setDataMimeType() {
      return this;
    }
    setRequestBody() {
      return this;
    }
    execute = jest.fn();
  }

  class MockFiles {
    newMultipartUploader() {
      return new MockUploader();
    }
    list = jest.fn().mockResolvedValue({ files: [] });
    delete = jest.fn();
    getText = jest.fn().mockResolvedValue('');
  }

  class GDrive {
    accessToken = '';
    files = new MockFiles();
  }

  return {
    __esModule: true,
    GDrive,
    MIME_TYPES: { application: { json: 'application/json' } },
    APP_DATA_FOLDER_ID: 'appDataFolder',
  };
});

// Mock react-native-cloud-storage
jest.mock('react-native-cloud-storage', () => {
  const mockCloudStorage = {
    setProviderOptions: jest.fn(),
    isCloudAvailable: jest.fn().mockResolvedValue(true),
    createFolder: jest.fn(),
    deleteFolder: jest.fn(),
    listFiles: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileInfo: jest.fn(),
    getStorageInfo: jest.fn(),
    getProvider: jest.fn(),
    mkdir: jest.fn(),
    exists: jest.fn(),
    rmdir: jest.fn(),
  };

  return {
    __esModule: true,
    CloudStorage: mockCloudStorage,
    CloudStorageScope: {
      AppData: 'AppData',
      Documents: 'Documents',
      Full: 'Full',
    },
    CloudStorageProvider: {
      GoogleDrive: 'GoogleDrive',
      ICloud: 'ICloud',
    },
  };
});

// Mock @react-native-clipboard/clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn().mockResolvedValue(''),
  setString: jest.fn(),
  hasString: jest.fn().mockResolvedValue(false),
}));

// Mock react-native-localize
jest.mock('react-native-localize', () => ({
  getLocales: jest.fn().mockReturnValue([
    {
      countryCode: 'US',
      languageTag: 'en-US',
      languageCode: 'en',
      isRTL: false,
    },
  ]),
  getCountry: jest.fn().mockReturnValue('US'),
  getTimeZone: jest.fn().mockReturnValue('America/New_York'),
  getCurrencies: jest.fn().mockReturnValue(['USD']),
  getTemperatureUnit: jest.fn().mockReturnValue('celsius'),
  getFirstWeekDay: jest.fn().mockReturnValue(0),
  uses24HourClock: jest.fn().mockReturnValue(false),
  usesMetricSystem: jest.fn().mockReturnValue(false),
  findBestAvailableLanguage: jest.fn().mockReturnValue({
    languageTag: 'en-US',
    isRTL: false,
  }),
}));

jest.mock('./src/utils/notifications/notificationService', () =>
  require('./tests/__setup__/notificationServiceMock.js'),
);

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');

  // Mock SvgXml component that handles XML strings
  const SvgXml = React.forwardRef(
    ({ xml, width, height, style, ...props }, ref) => {
      return React.createElement('div', {
        ref,
        style: {
          width: width || 'auto',
          height: height || 'auto',
          display: 'inline-block',
          ...style,
        },
        dangerouslySetInnerHTML: { __html: xml },
        ...props,
      });
    },
  );
  SvgXml.displayName = 'SvgXml';

  return {
    __esModule: true,
    default: SvgXml,
    SvgXml,
    Svg: props => React.createElement('Svg', props, props.children),
    Circle: props => React.createElement('Circle', props, props.children),
    Path: props => React.createElement('Path', props, props.children),
    G: props => React.createElement('G', props, props.children),
    Rect: props => React.createElement('Rect', props, props.children),
    Defs: props => React.createElement('Defs', props, props.children),
    LinearGradient: props =>
      React.createElement('LinearGradient', props, props.children),
    Stop: props => React.createElement('Stop', props, props.children),
    ClipPath: props => React.createElement('ClipPath', props, props.children),
    Polygon: props => React.createElement('Polygon', props, props.children),
    Polyline: props => React.createElement('Polyline', props, props.children),
    Line: props => React.createElement('Line', props, props.children),
    Text: props => React.createElement('Text', props, props.children),
    TSpan: props => React.createElement('TSpan', props, props.children),
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useFocusEffect: jest.fn(callback => {
      // Immediately invoke the effect for testing without requiring a container
      return callback();
    }),
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
    })),
    createNavigationContainerRef: jest.fn(() => ({
      current: null,
      getCurrentRoute: jest.fn(),
    })),
    createStaticNavigation: jest.fn(() => ({ displayName: 'MockNavigation' })),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    displayName: 'MockStackNavigator',
  })),
  createNavigatorFactory: jest.fn(),
}));

// Mock core navigation to avoid requiring a NavigationContainer for hooks
jest.mock('@react-navigation/core', () => {
  const actualCore = jest.requireActual('@react-navigation/core');
  return {
    ...actualCore,
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
    })),
  };
});

// Mock react-native-webview globally to avoid ESM parsing and native behaviors
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef((props, ref) => {
    return React.createElement(View, { ref, testID: 'webview', ...props });
  });
  MockWebView.displayName = 'MockWebView';
  return {
    __esModule: true,
    default: MockWebView,
    WebView: MockWebView,
  };
});

// Mock ExpandableBottomLayout to simple containers to avoid SDK internals in tests
jest.mock('@/layouts/ExpandableBottomLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Layout = ({ children }) => React.createElement(View, null, children);
  const TopSection = ({ children }) =>
    React.createElement(View, null, children);
  const BottomSection = ({ children }) =>
    React.createElement(View, null, children);
  const FullSection = ({ children }) =>
    React.createElement(View, null, children);
  return {
    __esModule: true,
    ExpandableBottomLayout: { Layout, TopSection, BottomSection, FullSection },
  };
});

// Mock mobile-sdk-alpha components used by NavBar (Button, XStack)
jest.mock('@selfxyz/mobile-sdk-alpha/components', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const Button = ({ children, onPress, icon, ...props }) =>
    React.createElement(
      TouchableOpacity,
      { onPress, ...props, testID: 'msdk-button' },
      icon
        ? React.createElement(View, { testID: 'msdk-button-icon' }, icon)
        : null,
      children,
    );
  const XStack = ({ children, ...props }) =>
    React.createElement(View, { ...props, testID: 'msdk-xstack' }, children);
  return {
    __esModule: true,
    Button,
    XStack,
    // Provide minimal Text to satisfy potential usages
    Text,
  };
});

// Mock Tamagui lucide icons to simple components to avoid theme context
jest.mock('@tamagui/lucide-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makeIcon = name => {
    const Icon = ({ size, color, opacity }) =>
      React.createElement(View, {
        testID: `icon-${name}`,
        size,
        color,
        opacity,
      });
    Icon.displayName = `MockIcon(${name})`;
    return Icon;
  };
  return {
    __esModule: true,
    ExternalLink: makeIcon('external-link'),
    X: makeIcon('x'),
  };
});

// Mock WebViewFooter to avoid SDK rendering complexity
jest.mock('@/components/WebViewFooter', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebViewFooter = () =>
    React.createElement(View, { testID: 'webview-footer' });
  return { __esModule: true, WebViewFooter };
});
