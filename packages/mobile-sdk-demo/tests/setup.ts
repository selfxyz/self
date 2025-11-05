// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import '@testing-library/jest-dom/vitest';
import React, { createElement, forwardRef } from 'react';
import { beforeEach, vi } from 'vitest';

import { sdkMocks } from './mocks/sdk';

// Mock @selfxyz/mobile-sdk-alpha
vi.mock('@selfxyz/mobile-sdk-alpha', () => {
  const extractMRZInfo = vi.fn((_mrz: string) => {
    // Mock implementation that returns basic MRZ info
    return {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      issuingCountry: 'UTO',
      documentType: 'P',
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };
  });

  const formatDateToYYMMDD = vi.fn((date: Date) => {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  });

  return {
    __esModule: true,
    extractMRZInfo,
    formatDateToYYMMDD,
  };
});

// Mock the onboarding/read-mrz module
vi.mock('@selfxyz/mobile-sdk-alpha/onboarding/read-mrz', () => ({
  __esModule: true,
  MRZScannerView: ({ onScan: _onScan, onError: _onError, ...props }: any) => {
    // Mock component for testing
    void props; // Explicitly mark as intentionally unused
    return null;
  },
}));

// Mock the DocumentCamera component to avoid import issues
vi.mock('../src/screens/DocumentCamera', () => ({
  __esModule: true,
  default: ({ onBack }: { onBack: () => void }) => {
    // Mock component for testing that returns the expected content
    return createElement('div', null, [
      createElement('h1', { key: 'title' }, 'Document Camera'),
      createElement('p', { key: 'description' }, 'Camera-based document scanning'),
      createElement('button', { key: 'back', onClick: onBack }, 'Back'),
    ]);
  },
}));

vi.mock('@selfxyz/common', async () => {
  const actual = await vi.importActual<any>('../../../common/dist/cjs/index.cjs');
  const nodeCrypto = await import('node:crypto');

  const polyfill = {
    createHash: nodeCrypto.createHash.bind(nodeCrypto) as typeof nodeCrypto.createHash,
    createHmac: nodeCrypto.createHmac.bind(nodeCrypto) as typeof nodeCrypto.createHmac,
    randomBytes: nodeCrypto.randomBytes.bind(nodeCrypto) as typeof nodeCrypto.randomBytes,
    pbkdf2Sync: nodeCrypto.pbkdf2Sync.bind(nodeCrypto) as typeof nodeCrypto.pbkdf2Sync,
  };

  const calculateContentHash = actual.calculateContentHash
    ? actual.calculateContentHash
    : (value: unknown) =>
        nodeCrypto
          .createHash('sha256')
          .update(typeof value === 'string' ? value : JSON.stringify(value))
          .digest('hex');

  return {
    ...actual,
    ...polyfill,
    calculateContentHash,
    cryptoPolyfill: polyfill,
  };
});

/**
 * Vitest setup file for mobile-sdk-demo tests
 * Mocks React Native modules and reduces console noise
 */

const originalConsole = {
  warn: console.warn,
  error: console.error,
  log: console.log,
};

const shouldShowOutput = process.env.DEBUG_TESTS === 'true';

// Suppress console noise in tests unless explicitly debugging
if (!shouldShowOutput) {
  console.warn = () => {};
  console.error = () => {};
  console.log = () => {};
}

// Restore console for debugging if needed
if (typeof globalThis !== 'undefined') {
  (globalThis as any).restoreConsole = () => {
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.log = originalConsole.log;
  };
  (globalThis as any).sdkMocks = sdkMocks;
}

const flattenStyle = (style: any): Record<string, unknown> | undefined => {
  if (!style) return undefined;
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, item) => {
      const flat = flattenStyle(item);
      return flat ? { ...acc, ...flat } : acc;
    }, {});
  }
  if (typeof style === 'number') {
    return { ['data-style-token']: style };
  }
  if (typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return undefined;
};

const createDomComponent = (tag: string) =>
  forwardRef<any, any>(({ children, style, testID, ...props }, ref) =>
    createElement(tag, { ref, style: flattenStyle(style), 'data-testid': testID, ...props }, children),
  );

const TouchableOpacity = forwardRef<any, any>(
  ({ children, onPress, disabled, style, testID, accessibilityRole, ...props }, ref) =>
    createElement(
      'button',
      {
        type: 'button',
        ref,
        disabled: Boolean(disabled),
        style: flattenStyle(style),
        'data-testid': testID,
        'aria-busy': props['aria-busy'],
        'aria-disabled': disabled ? 'true' : undefined,
        'data-role': accessibilityRole,
        onClick: disabled
          ? undefined
          : (event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              onPress?.();
            },
        ...props,
      },
      children,
    ),
);

const ScrollView = forwardRef<any, any>(({ children, style, contentContainerStyle, testID, ...props }, ref) =>
  createElement(
    'div',
    { ref, style: flattenStyle(style), 'data-testid': testID, ...props },
    createElement('div', { style: flattenStyle(contentContainerStyle) }, children),
  ),
);

const Pressable = forwardRef<any, any>(({ children, onPress, disabled, style, testID, ...props }, ref) =>
  createElement(
    'button',
    {
      type: 'button',
      ref,
      disabled: Boolean(disabled),
      style: flattenStyle(style),
      'data-testid': testID,
      onClick: disabled
        ? undefined
        : (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            onPress?.();
          },
      ...props,
    },
    children,
  ),
);

const TextInput = forwardRef<any, any>(
  ({ onChangeText, value, secureTextEntry, style, testID, keyboardType, ...props }, ref) =>
    createElement('input', {
      ref,
      value,
      style: flattenStyle(style),
      type: secureTextEntry ? 'password' : 'text',
      inputMode: keyboardType === 'numeric' ? 'numeric' : undefined,
      'data-testid': testID,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target as any;
        onChangeText?.(target.value);
      },
      ...props,
    }),
);

const Switch = ({
  value,
  onValueChange,
  testID,
}: {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  testID?: string;
}) =>
  createElement('input', {
    type: 'checkbox',
    checked: value,
    'data-testid': testID,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const target = event.target as any;
      onValueChange?.(target.checked);
    },
  });

const Button = ({
  title,
  onPress,
  disabled,
  testID,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) =>
  createElement(
    'button',
    {
      type: 'button',
      disabled: Boolean(disabled),
      onClick: disabled
        ? undefined
        : (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            onPress?.();
          },
      'data-testid': testID,
    },
    title,
  );

const Modal = ({ visible, children, testID }: { visible: boolean; children: React.ReactNode; testID?: string }) =>
  visible ? createElement('div', { 'data-testid': testID }, children) : null;

const SafeAreaView = createDomComponent('div');

const FlatList = ({
  data = [],
  renderItem,
  keyExtractor,
  testID,
}: {
  data?: any[];
  renderItem: ({ item, index }: { item: any; index: number }) => React.ReactNode;
  keyExtractor?: (item: any, index: number) => string;
  testID?: string;
}) =>
  createElement(
    'div',
    { 'data-testid': testID },
    data.map((item, index) =>
      createElement(
        React.Fragment,
        { key: keyExtractor ? keyExtractor(item, index) : index },
        renderItem({ item, index }),
      ),
    ),
  );

const ActivityIndicator = ({ testID, accessibilityLabel }: { testID?: string; accessibilityLabel?: string }) =>
  createElement('div', {
    role: 'status',
    'aria-label': accessibilityLabel ?? 'loading',
    'data-testid': testID,
  });

const alertSpy = vi.fn();

beforeEach(() => {
  sdkMocks.reset();
  alertSpy.mockReset();
});

vi.mock('react-native', () => ({
  __esModule: true,
  Platform: {
    OS: 'ios',
    select: (obj: Record<string, any>) => (Object.prototype.hasOwnProperty.call(obj, 'ios') ? obj.ios : obj.default),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812, scale: 2 }),
  },
  PixelRatio: {
    get: () => 2,
  },
  NativeModules: {
    PlatformConstants: {
      getConstants: () => ({ isTesting: true }),
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
    StatusBarManager: { getConstants: () => ({}) },
    Appearance: { getConstants: () => ({ colorScheme: 'light' }) },
    SourceCode: {
      getConstants: () => ({ scriptURL: 'http://localhost/index.bundle' }),
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
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: flattenStyle,
    hairlineWidth: 0.5,
  },
  View: createDomComponent('div'),
  Text: createDomComponent('span'),
  ScrollView,
  TextInput,
  Pressable,
  Button,
  Switch,
  Modal,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert: { alert: alertSpy },
}));

// Mock safe area context primitives
vi.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
  SafeAreaView: forwardRef<any, any>(({ children, style, testID }, ref) =>
    createElement('div', { ref, style: flattenStyle(style), 'data-testid': testID }, children),
  ),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock vector icons
vi.mock('react-native-vector-icons/Ionicons', () => ({
  __esModule: true,
  default: ({ name, testID }: { name: string; testID?: string }) =>
    createElement('span', { 'data-icon': name, 'data-testid': testID }, name),
}));

// Mock @react-native-async-storage/async-storage
const asyncStorageStore = new Map<string, string | null>();
const asyncStorageApi = {
  setItem: vi.fn(async (key: string, value: string) => {
    asyncStorageStore.set(key, value);
  }),
  getItem: vi.fn(async (key: string) => asyncStorageStore.get(key) ?? null),
  removeItem: vi.fn(async (key: string) => {
    asyncStorageStore.delete(key);
  }),
  clear: vi.fn(async () => {
    asyncStorageStore.clear();
  }),
  getAllKeys: vi.fn(async () => Array.from(asyncStorageStore.keys())),
  multiGet: vi.fn(async (keys: string[]) => keys.map(key => [key, asyncStorageStore.get(key) ?? null] as const)),
  multiSet: vi.fn(async (entries: Array<[string, string]>) => {
    entries.forEach(([key, value]) => asyncStorageStore.set(key, value));
  }),
  multiRemove: vi.fn(async (keys: string[]) => {
    keys.forEach(key => asyncStorageStore.delete(key));
  }),
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: asyncStorageApi,
  ...asyncStorageApi,
}));

// Mock react-native-keychain with in-memory storage
const keychainStore: Record<string, { username: string; password: string }> = {};

const mockSetGenericPassword = vi.fn(async (username: string, password: string, options?: { service?: string }) => {
  const key = options?.service || 'default';
  keychainStore[key] = { username, password };
  return true;
});

const mockGetGenericPassword = vi.fn(async (options?: { service?: string }) => {
  const key = options?.service || 'default';
  const credentials = keychainStore[key];
  return credentials || false;
});

const mockResetGenericPassword = vi.fn(async (options?: { service?: string }) => {
  const key = options?.service || 'default';
  delete keychainStore[key];
  return true;
});

vi.mock('react-native-keychain', () => ({
  __esModule: true,
  default: {
    setGenericPassword: mockSetGenericPassword,
    getGenericPassword: mockGetGenericPassword,
    resetGenericPassword: mockResetGenericPassword,
  },
  setGenericPassword: mockSetGenericPassword,
  getGenericPassword: mockGetGenericPassword,
  resetGenericPassword: mockResetGenericPassword,
  SECURITY_LEVEL: {
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    SECURE_HARDWARE: 'SECURE_HARDWARE',
  },
}));

// Mock react-native-get-random-values
vi.mock('react-native-get-random-values', () => ({
  __esModule: true,
  polyfillGlobal: vi.fn(),
}));

// Mock react-native-haptic-feedback
vi.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: {
    trigger: vi.fn(),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  __esModule: true,
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock SVG asset used on the home screen
vi.mock('../src/assets/images/logo.svg', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => createElement('svg', { 'data-testid': 'logo', ...props }),
}));

// Ensure window.matchMedia exists for libraries relying on it
if (typeof (globalThis as any).window !== 'undefined') {
  Object.defineProperty((globalThis as any).window, 'matchMedia', {
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
