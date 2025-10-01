// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Vitest setup file for mobile-sdk-demo tests
 * Mocks React Native modules and reduces console noise
 */

import { vi } from 'vitest';

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
    PlatformConstants: {
      getConstants: () => ({
        isTesting: true,
        reactNativeVersion: {
          major: 0,
          minor: 76,
          patch: 9,
        },
      }),
    },
    DeviceInfo: {
      getConstants: () => ({
        Dimensions: {
          window: { width: 375, height: 812 },
          screen: { width: 375, height: 812 },
        },
        PixelRatio: 2,
      }),
    },
    StatusBarManager: {
      getConstants: () => ({}),
    },
    Appearance: {
      getConstants: () => ({}),
    },
    SourceCode: {
      getConstants: () => ({
        scriptURL: 'http://localhost:8081/index.bundle?platform=ios&dev=true',
      }),
    },
    UIManager: {
      getConstants: () => ({}),
      measure: vi.fn(),
      measureInWindow: vi.fn(),
      measureLayout: vi.fn(),
      findSubviewIn: vi.fn(),
      dispatchViewManagerCommand: vi.fn(),
      setLayoutAnimationEnabledExperimental: vi.fn(),
      configureNextLayoutAnimation: vi.fn(),
    },
    KeyboardObserver: {
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    },
  },
  requireNativeComponent: vi.fn(() => 'div'),
  StyleSheet: {
    create: vi.fn(styles => styles),
  },
}));

// Mock @react-native-async-storage/async-storage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
    removeItem: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiGet: vi.fn(() => Promise.resolve([])),
    multiSet: vi.fn(() => Promise.resolve()),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

// Mock react-native-keychain
vi.mock('react-native-keychain', () => ({
  default: {
    setGenericPassword: vi.fn(() => Promise.resolve(true)),
    getGenericPassword: vi.fn(() => Promise.resolve(false)),
    resetGenericPassword: vi.fn(() => Promise.resolve(true)),
  },
  setGenericPassword: vi.fn(() => Promise.resolve(true)),
  getGenericPassword: vi.fn(() => Promise.resolve(false)),
  resetGenericPassword: vi.fn(() => Promise.resolve(true)),
  SECURITY_LEVEL: {
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    SECURE_HARDWARE: 'SECURE_HARDWARE',
  },
}));

// Mock react-native-get-random-values
vi.mock('react-native-get-random-values', () => ({
  polyfillGlobal: vi.fn(),
}));

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
