// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/* global jest */
/** @jest-environment jsdom */
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

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
  addEventListener: jest.fn(),
  useNetInfo: jest.fn().mockReturnValue({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      cellularGeneration: '4g',
    },
  }),
  fetch: jest.fn(),
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
jest.mock('react-native-passport-reader', () => ({
  default: {
    initialize: jest.fn(),
    scanPassport: jest.fn(),
    readPassport: jest.fn(),
    cancelPassportRead: jest.fn(),
  },
}));

// Mock @stablelib packages
jest.mock('@stablelib/cbor', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('@stablelib/utf8', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

// Mock @react-native-google-signin/google-signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      user: {
        id: 'mock-user-id',
        email: 'mock@example.com',
        name: 'Mock User',
        photo: 'mock-photo-url',
      },
    }),
    signOut: jest.fn(),
    revokeAccess: jest.fn(),
    isSignedIn: jest.fn().mockResolvedValue(false),
    getCurrentUser: jest.fn().mockResolvedValue(null),
    getTokens: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token',
    }),
  },
  statusCodes: {
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

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
