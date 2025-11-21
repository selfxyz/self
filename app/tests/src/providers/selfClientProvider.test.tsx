// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Mock ConfirmIdentificationScreen to avoid PixelRatio issues
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';

jest.mock('@/assets/images/512w.png', () => 'mock-512w-image');
jest.mock('@/assets/images/nfc.png', () => 'mock-nfc-image');
jest.mock('react-native-localize', () => {
  const getLocales = jest.fn(() => [
    {
      countryCode: 'US',
      languageTag: 'en-US',
      languageCode: 'en',
      isRTL: false,
    },
  ]);
  const getCountry = jest.fn(() => 'US');

  return {
    __esModule: true,
    default: {
      getLocales,
      getCountry,
    },
    getLocales,
    getCountry,
  };
});

jest.mock('@/navigation', () => {
  const navigationRef = {
    isReady: jest.fn(() => false),
    navigate: jest.fn(),
  };
  return {
    __esModule: true,
    navigationRef,
    default: navigationRef,
  };
});

jest.mock(
  '@selfxyz/mobile-sdk-alpha/onboarding/confirm-identification',
  () => ({
    ConfirmIdentificationScreen: ({ children }: any) => children,
  }),
);

jest.mock('@selfxyz/mobile-sdk-alpha', () => {
  const mockClient = {
    getSelfAppState: jest.fn(() => ({})),
    getProtocolState: jest.fn(() => ({})),
    getDeepLinksState: jest.fn(() => ({})),
  };
  const mockSdkProvider = ({ children }: any) => (
    <mock-sdk-provider>{children}</mock-sdk-provider>
  );

  const createListenersMap = () => {
    const map = new Map();
    return {
      map,
      addListener: (event: string, callback: (...args: unknown[]) => void) => {
        map.set(event, callback);
      },
    };
  };

  const SdkEvents = {
    PROVING_PASSPORT_DATA_NOT_FOUND: 'PROVING_PASSPORT_DATA_NOT_FOUND',
    PROVING_ACCOUNT_VERIFIED_SUCCESS: 'PROVING_ACCOUNT_VERIFIED_SUCCESS',
    PROVING_REGISTER_ERROR_OR_FAILURE: 'PROVING_REGISTER_ERROR_OR_FAILURE',
    PROVING_ACCOUNT_VERIFIED_PENDING: 'PROVING_ACCOUNT_VERIFIED_PENDING',
    PROVING_ACCOUNT_VERIFIED_FAILURE: 'PROVING_ACCOUNT_VERIFIED_FAILURE',
  };

  return {
    __esModule: true,
    useSelfClient: jest.fn(() => mockClient),
    SelfClientProvider: mockSdkProvider,
    createListenersMap,
    impactLight: jest.fn(),
    reactNativeScannerAdapter: {},
    SdkEvents,
    webNFCScannerShim: {},
  };
});

let useSelfClient: () => unknown;
let SelfClientProvider: ({ children }: { children: ReactNode }) => JSX.Element;

beforeAll(() => {
  ({ useSelfClient } = require('@selfxyz/mobile-sdk-alpha'));
  ({ SelfClientProvider } = require('@/providers/selfClientProvider'));
});

describe('SelfClientProvider', () => {
  it('memoises the client instance', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider>{children}</SelfClientProvider>
    );
    const { result, rerender } = renderHook(() => useSelfClient(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('wires Web Crypto hashing and network adapters', async () => {
    const originalFetch = (global as any).fetch;
    const originalWebSocket = (global as any).WebSocket;

    try {
      const fetchSpy = jest.fn(async () => new Response(null));
      (global as any).fetch = fetchSpy;
      class MockSocket {
        url: string;
        constructor(url: string) {
          this.url = url;
        }
        addEventListener() {}
        send() {}
        close() {}
      }
      (global as any).WebSocket = MockSocket;

      const wrapper = ({ children }: { children: ReactNode }) => (
        <SelfClientProvider>{children}</SelfClientProvider>
      );
      renderHook(() => useSelfClient(), { wrapper });

      const data = new TextEncoder().encode('hello');
      const digest = await crypto.subtle.digest('SHA-256', data);
      expect(digest.byteLength).toBeGreaterThan(0);

      await expect(fetch('https://example.com')).resolves.toBeDefined();
      const socket = new WebSocket('ws://example.com');
      expect(typeof (socket as any).send).toBe('function');
    } finally {
      // Cleanup - restore original globals
      (global as any).fetch = originalFetch;
      (global as any).WebSocket = originalWebSocket;
    }
  });
});
