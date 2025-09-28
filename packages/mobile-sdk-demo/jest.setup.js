// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/** @jest-environment jsdom */

// Mock the native bridge configuration FIRST
global.__fbBatchedBridgeConfig = {
  remoteModuleConfig: [],
  localModulesConfig: {},
};

// Mock React Native's native modules
const { NativeModules } = require('react-native');

// Mock NativeModules
NativeModules.PlatformConstants = {
  getConstants: () => ({
    isTesting: true,
    reactNativeVersion: {
      major: 0,
      minor: 76,
      patch: 9,
    },
  }),
};

// Mock DeviceInfo native module
NativeModules.DeviceInfo = {
  getConstants: () => ({
    Dimensions: {
      window: { width: 375, height: 812 },
      screen: { width: 375, height: 812 },
    },
    PixelRatio: 2,
  }),
};

// Mock other common native modules
NativeModules.StatusBarManager = {
  getConstants: () => ({}),
};

NativeModules.Appearance = {
  getConstants: () => ({}),
};

NativeModules.SourceCode = {
  getConstants: () => ({
    scriptURL: 'http://localhost:8081/index.bundle?platform=ios&dev=true',
  }),
};

NativeModules.UIManager = {
  getConstants: () => ({}),
  measure: jest.fn(),
  measureInWindow: jest.fn(),
  measureLayout: jest.fn(),
  findSubviewIn: jest.fn(),
  dispatchViewManagerCommand: jest.fn(),
  setLayoutAnimationEnabledExperimental: jest.fn(),
  configureNextLayoutAnimation: jest.fn(),
  removeSubviewsFromContainerWithID: jest.fn(),
  replaceExistingNonRootView: jest.fn(),
  setChildren: jest.fn(),
  manageChildren: jest.fn(),
  setJSResponder: jest.fn(),
  clearJSResponder: jest.fn(),
  createView: jest.fn(),
  updateView: jest.fn(),
  removeRootView: jest.fn(),
  addRootView: jest.fn(),
  updateRootView: jest.fn(),
};

NativeModules.KeyboardObserver = {
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({
  polyfillGlobal: jest.fn(),
}));

// Mock @react-native-picker/picker
jest.mock(
  '@react-native-picker/picker',
  () => {
    const Picker = ({ children }) => children;
    Picker.Item = () => null;
    const PickerIOS = Picker;
    return { Picker, PickerIOS };
  },
  { virtual: true },
);

// Mock ethers
jest.mock('ethers', () => {
  const mockRandomBytes = jest.fn().mockImplementation(length => new Uint8Array(length));
  mockRandomBytes.register = jest.fn();

  const mockHashFunction = jest.fn().mockImplementation(() => '0x' + 'a'.repeat(64));
  mockHashFunction.register = jest.fn();

  const mockSha512Function = jest.fn().mockImplementation(() => '0x' + 'a'.repeat(128));
  mockSha512Function.register = jest.fn();

  return {
    ethers: {
      Wallet: jest.fn().mockImplementation(() => ({
        address: '0x1234567890123456789012345678901234567890',
        signMessage: jest.fn().mockResolvedValue('0xsignature'),
      })),
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
      })),
      randomBytes: mockRandomBytes,
      computeHmac: mockHashFunction,
      pbkdf2: mockHashFunction,
      sha256: mockHashFunction,
      sha512: mockSha512Function,
      ripemd160: mockHashFunction,
      scrypt: mockHashFunction,
    },
  };
});

// Mock @selfxyz/common with partial overrides used across the demo
jest.mock('@selfxyz/common', () => {
  const { createHash } = require('crypto');

  const countryCodes = {
    USA: 'United States',
    CAN: 'Canada',
    IND: 'India',
  };

  return {
    calculateContentHash: data => {
      return createHash('sha256').update(JSON.stringify(data)).digest('hex');
    },
    inferDocumentCategory: documentType => {
      if (documentType.includes('aadhaar')) return 'aadhaar';
      if (documentType.includes('id_card')) return 'id_card';
      return 'passport';
    },
    isMRZDocument: (doc: any) => Boolean(doc?.mrz),
    countryCodes,
    generateMockPassportData: jest.fn().mockReturnValue({
      documentNumber: '123456789',
      dateOfBirth: '1990-01-01',
      dateOfExpiry: '2030-01-01',
      firstName: 'John',
      lastName: 'Doe',
    }),
    cryptoPolyfill: {
      createHash: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked-hash'),
      }),
      createHmac: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('mocked-hmac'),
      }),
      randomBytes: jest.fn().mockImplementation(size => new Uint8Array(size)),
      pbkdf2Sync: jest.fn().mockImplementation(() => new Uint8Array(32)),
    },
  };
});

// Mock @selfxyz/mobile-sdk-alpha with lightweight client implementation for tests
jest.mock('@selfxyz/mobile-sdk-alpha', () => {
  const createSelfClient = ({ adapters, listeners = new Map() }) => {
    const ensureAdapter = adapter => {
      if (!adapter) {
        throw new Error('Adapter missing in test environment');
      }
      return adapter;
    };

    const documents = ensureAdapter(adapters.documents);
    const auth = adapters.auth;

    return {
      async scanDocument(opts) {
        if (!adapters.scanner?.scan) {
          throw new Error('Scanner adapter not mocked');
        }
        return adapters.scanner.scan(opts);
      },
      extractMRZInfo() {
        throw new Error('extractMRZInfo not implemented in test mock');
      },
      trackEvent() {},
      async getPrivateKey() {
        return auth?.getPrivateKey ? auth.getPrivateKey() : null;
      },
      async hasPrivateKey() {
        const key = auth?.getPrivateKey ? await auth.getPrivateKey() : null;
        return Boolean(key);
      },
      on(event, cb) {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(cb);
        return () => {
          listeners.get(event)?.delete(cb);
        };
      },
      emit(event, payload) {
        const subs = listeners.get(event);
        if (!subs) return;
        subs.forEach(cb => cb(payload));
      },
      loadDocumentCatalog: () => documents.loadDocumentCatalog(),
      saveDocumentCatalog: catalog => documents.saveDocumentCatalog(catalog),
      loadDocumentById: id => documents.loadDocumentById(id),
      saveDocument: (id, data) => documents.saveDocument(id, data),
      deleteDocument: id => documents.deleteDocument(id),
    };
  };

  return {
    createSelfClient,
    SdkEvents: { DUMMY: 'DUMMY' },
    generateMockDocument: jest.fn(),
    signatureAlgorithmToStrictSignatureAlgorithm: {
      'sha256 rsa 65537 2048': 'sha256 rsa 65537 2048',
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock console methods to avoid test output clutter
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
