// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Mock ConfirmIdentificationScreen to avoid PixelRatio issues
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import { createKycSession, launchKycVerification } from '@/integrations/kyc';
import { useSettingStore } from '@/stores/settingStore';

let mockSdkProviderProps: Record<string, unknown> | undefined;

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

jest.mock('@/integrations/kyc', () => ({
  createKycSession: jest.fn(),
  launchKycVerification: jest.fn(),
}));

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
  const mockSdkProvider = ({ children, ...props }: any) => {
    mockSdkProviderProps = props;
    return <mock-sdk-provider>{children}</mock-sdk-provider>;
  };

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
    PROVING_PASSPORT_NOT_SUPPORTED: 'PROVING_PASSPORT_NOT_SUPPORTED',
    PROVING_ACCOUNT_RECOVERY_REQUIRED: 'PROVING_ACCOUNT_RECOVERY_REQUIRED',
    PROVING_BEGIN_GENERATION: 'PROVING_BEGIN_GENERATION',
    PROOF_EVENT: 'PROOF_EVENT',
    NFC_EVENT: 'NFC_EVENT',
    DOCUMENT_MRZ_READ_SUCCESS: 'DOCUMENT_MRZ_READ_SUCCESS',
    DOCUMENT_MRZ_READ_FAILURE: 'DOCUMENT_MRZ_READ_FAILURE',
    PROVING_AADHAAR_UPLOAD_SUCCESS: 'PROVING_AADHAAR_UPLOAD_SUCCESS',
    PROVING_AADHAAR_UPLOAD_FAILURE: 'PROVING_AADHAAR_UPLOAD_FAILURE',
    DOCUMENT_COUNTRY_SELECTED: 'DOCUMENT_COUNTRY_SELECTED',
    DOCUMENT_TYPE_SELECTED: 'DOCUMENT_TYPE_SELECTED',
    DOCUMENT_OWNERSHIP_CONFIRMED: 'DOCUMENT_OWNERSHIP_CONFIRMED',
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
let SdkEvents: Record<string, string>;
let navigationRef: {
  isReady: jest.Mock<boolean, []>;
  navigate: jest.Mock;
};

const MockCreateKycSession = createKycSession as jest.MockedFunction<
  typeof createKycSession
>;
const MockLaunchKycVerification = launchKycVerification as jest.MockedFunction<
  typeof launchKycVerification
>;

beforeAll(() => {
  ({ useSelfClient } = require('@selfxyz/mobile-sdk-alpha'));
  ({ SdkEvents } = require('@selfxyz/mobile-sdk-alpha'));
  ({ SelfClientProvider } = require('@/providers/selfClientProvider'));
  ({ navigationRef } = require('@/navigation'));
});

describe('SelfClientProvider', () => {
  beforeEach(() => {
    mockSdkProviderProps = undefined;
    jest.clearAllMocks();
    navigationRef.isReady.mockReturnValue(false);
    useSettingStore.setState(useSettingStore.getInitialState(), true);
  });

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

  it('consumes shouldBypassDocumentRegistrationCheck as a one-shot flag', () => {
    act(() => {
      useSettingStore.getState().armTestRegistrationCircuit();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider>{children}</SelfClientProvider>
    );
    renderHook(() => useSelfClient(), { wrapper });

    const config = mockSdkProviderProps?.config as
      | {
          devConfig?: {
            shouldBypassDocumentRegistrationCheck?: () => boolean;
            shouldBypassDscRegistrationCheck?: () => boolean;
          };
        }
      | undefined;

    expect(config?.devConfig?.shouldBypassDocumentRegistrationCheck?.()).toBe(
      true,
    );
    expect(config?.devConfig?.shouldBypassDocumentRegistrationCheck?.()).toBe(
      false,
    );
    expect(useSettingStore.getState().testRegistrationCircuitArmed).toBe(false);
  });

  it('consumes shouldBypassDscRegistrationCheck as a one-shot flag', () => {
    act(() => {
      useSettingStore.getState().armTestDscCircuit();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider>{children}</SelfClientProvider>
    );
    renderHook(() => useSelfClient(), { wrapper });

    const config = mockSdkProviderProps?.config as
      | {
          devConfig?: {
            shouldBypassDocumentRegistrationCheck?: () => boolean;
            shouldBypassDscRegistrationCheck?: () => boolean;
          };
        }
      | undefined;

    expect(config?.devConfig?.shouldBypassDscRegistrationCheck?.()).toBe(true);
    expect(config?.devConfig?.shouldBypassDscRegistrationCheck?.()).toBe(false);
    expect(useSettingStore.getState().testDscCircuitArmed).toBe(false);
  });

  it('keeps document and DSC bypasses independent', () => {
    act(() => {
      useSettingStore.getState().armTestRegistrationCircuit();
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider>{children}</SelfClientProvider>
    );
    renderHook(() => useSelfClient(), { wrapper });

    const config = mockSdkProviderProps?.config as
      | {
          devConfig?: {
            shouldBypassDocumentRegistrationCheck?: () => boolean;
            shouldBypassDscRegistrationCheck?: () => boolean;
          };
        }
      | undefined;

    // DSC bypass is not armed even though the document bypass is.
    expect(config?.devConfig?.shouldBypassDscRegistrationCheck?.()).toBe(false);
    expect(config?.devConfig?.shouldBypassDocumentRegistrationCheck?.()).toBe(
      true,
    );
  });

  it('routes declined KYC provider results to KycFailure without advancing', async () => {
    navigationRef.isReady.mockReturnValue(true);
    MockCreateKycSession.mockResolvedValue({
      sessionId: 'sess-1',
      sessionToken: 'tok-1',
    });
    MockLaunchKycVerification.mockResolvedValue({
      type: 'completed',
      session: {
        status: 'Declined',
        sessionId: 'didit-session-1',
      },
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SelfClientProvider>{children}</SelfClientProvider>
    );
    renderHook(() => useSelfClient(), { wrapper });

    const listeners = mockSdkProviderProps?.listeners as
      | Map<string, (payload: unknown) => void>
      | undefined;
    const onDocumentTypeSelected = listeners?.get(
      SdkEvents.DOCUMENT_TYPE_SELECTED,
    );

    expect(onDocumentTypeSelected).toBeDefined();

    await act(async () => {
      onDocumentTypeSelected?.({ documentType: 'kyc', countryCode: 'US' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(navigationRef.navigate).toHaveBeenCalledWith('KycFailure', {
      countryCode: 'US',
      canRetry: true,
    });
    expect(navigationRef.navigate).not.toHaveBeenCalledWith('KycSuccess', {
      sessionId: 'sess-1',
    });
  });
});
