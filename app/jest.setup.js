// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* global jest */
/** @jest-environment jsdom */
require('react-native-gesture-handler/jestSetup');

// Mock NativeAnimatedHelper - using virtual mock during RN 0.76.9 prep phase
jest.mock(
  'react-native/src/private/animated/NativeAnimatedHelper',
  () => ({}),
  { virtual: true },
);

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

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
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
