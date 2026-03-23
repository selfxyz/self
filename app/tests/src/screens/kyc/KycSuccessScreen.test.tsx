// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { v5 as uuidv5 } from 'uuid';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ErrorBoundary from '@/components/ErrorBoundary';
import KycSuccessScreen from '@/screens/kyc/KycSuccessScreen';
import * as notificationService from '@/services/notifications/notificationService';

// Note: While jest.setup.js provides comprehensive React Native mocking,
// react-test-renderer requires component-based mocks (functions) rather than
// string-based mocks for proper rendering. This minimal mock provides the
// specific components needed for this test without using requireActual to
// avoid memory issues (see .cursor/rules/test-memory-optimization.mdc).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'ios', select: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  NativeModules: {
    NativeLoggerBridge: {},
    RNPassportReader: {},
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  })),
  requireNativeComponent: jest.fn(() => 'NativeComponent'),
}));

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: () => null,
}));

jest.mock('@/hooks/useDiditWebSocket', () => ({
  useDiditWebSocket: jest.fn(() => ({
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    unsubscribeAll: jest.fn(),
  })),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0 })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock Tamagui components
jest.mock('tamagui', () => ({
  __esModule: true,
  YStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  styled: (Component: any) => (props: any) => <Component {...props} />,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000000',
  white: '#FFFFFF',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  AbstractButton: ({ children, onPress }: any) => (
    <button onClick={onPress} type="button">
      {children}
    </button>
  ),
  PrimaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress} type="button">
      {children}
    </button>
  ),
  SecondaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress} type="button">
      {children}
    </button>
  ),
  Title: ({ children }: any) => <div data-testid="title">{children}</div>,
  Description: ({ children }: any) => (
    <div data-testid="description">{children}</div>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  ProofEvents: {
    FCM_TOKEN_STORED: 'FCM_TOKEN_STORED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/animations/loading/misc.json', () => ({}));

jest.mock('@/integrations/haptics', () => ({
  buttonTap: jest.fn(),
}));

jest.mock('@/services/notifications/notificationService', () => ({
  ...jest.requireActual('@/services/notifications/notificationService'),
  requestNotificationPermission: jest.fn(),
  getFCMToken: jest.fn(),
  registerDeviceToken: jest.fn(),
}));

jest.mock('@/config/sentry', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/services/analytics', () => ({
  flushAllAnalytics: jest.fn(),
  trackNfcEvent: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: () => null,
  useSelfClient: jest.fn(),
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loggingSeverity: 'info' })),
    subscribe: jest.fn(() => jest.fn()),
  }),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Import mocked modules
const { useSelfClient } = jest.requireMock('@selfxyz/mobile-sdk-alpha');
const { useSettingStore } = jest.requireMock('@/stores/settingStore');

describe('KycSuccessScreen', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockSetFcmToken = jest.fn();
  const mockSessionId = '19f21362-856a-4606-88e1-fa306036978f';
  const mockFcmToken = 'mock-fcm-token';
  const mockRoute = {
    params: {
      sessionId: mockSessionId,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);

    useSelfClient.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    useSettingStore.mockReturnValue(mockSetFcmToken);

    (
      notificationService.requestNotificationPermission as jest.Mock
    ).mockResolvedValue(true);
    (notificationService.getFCMToken as jest.Mock).mockResolvedValue(
      mockFcmToken,
    );
    (notificationService.registerDeviceToken as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it('should render the screen without errors', () => {
    const { root } = render(<KycSuccessScreen route={mockRoute} />);
    expect(root).toBeTruthy();
  });

  it('should have navigation available', () => {
    render(<KycSuccessScreen route={mockRoute} />);
    expect(mockUseNavigation).toHaveBeenCalled();
  });

  it('should have notification service available', () => {
    render(<KycSuccessScreen route={mockRoute} />);
    expect(notificationService.requestNotificationPermission).toBeDefined();
  });

  it('should fetch and register FCM token when "Receive live updates" is pressed', async () => {
    const { root } = render(<KycSuccessScreen route={mockRoute} />);

    const buttons = root.findAllByType('button');
    const receiveUpdatesButton = buttons[0]; // First button is "Receive live updates"
    fireEvent.press(receiveUpdatesButton);

    await waitFor(() => {
      // Verify notification permission was requested
      expect(
        notificationService.requestNotificationPermission,
      ).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      // Verify FCM token was fetched
      expect(notificationService.getFCMToken).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      // Verify FCM token was stored in settings store
      expect(mockSetFcmToken).toHaveBeenCalledWith(mockFcmToken);
    });

    await waitFor(() => {
      // Verify tracking event was sent
      expect(mockTrackEvent).toHaveBeenCalledWith('FCM_TOKEN_STORED');
    });

    await waitFor(() => {
      // Verify device token was registered with deterministic session ID
      expect(notificationService.registerDeviceToken).toHaveBeenCalledWith(
        uuidv5(mockSessionId, notificationService.SELF_UUID_NAMESPACE),
        mockFcmToken,
      );
    });

    await waitFor(() => {
      // Verify navigation to Home screen
      expect(mockNavigate).toHaveBeenCalledWith('Home', {});
    });
  });

  it('should navigate to Home without FCM token when permission is denied', async () => {
    (
      notificationService.requestNotificationPermission as jest.Mock
    ).mockResolvedValue(false);

    const { root } = render(<KycSuccessScreen route={mockRoute} />);

    const buttons = root.findAllByType('button');
    const receiveUpdatesButton = buttons[0]; // First button is "Receive live updates"
    fireEvent.press(receiveUpdatesButton);

    await waitFor(() => {
      // Verify notification permission was requested
      expect(
        notificationService.requestNotificationPermission,
      ).toHaveBeenCalledTimes(1);
    });

    // Verify FCM token was NOT fetched
    expect(notificationService.getFCMToken).not.toHaveBeenCalled();

    // Verify FCM token was NOT stored
    expect(mockSetFcmToken).not.toHaveBeenCalled();

    // Verify device token was NOT registered
    expect(notificationService.registerDeviceToken).not.toHaveBeenCalled();

    await waitFor(() => {
      // Verify navigation to Home screen still happens
      expect(mockNavigate).toHaveBeenCalledWith('Home', {});
    });
  });

  it('should navigate to Home when "I will check back later" is pressed', () => {
    const { root } = render(<KycSuccessScreen route={mockRoute} />);

    const buttons = root.findAllByType('button');
    const checkLaterButton = buttons[1]; // Second button is "I will check back later"
    fireEvent.press(checkLaterButton);

    // Verify navigation to Home screen
    expect(mockNavigate).toHaveBeenCalledWith('Home', {});

    // Verify FCM-related functions were NOT called
    expect(
      notificationService.requestNotificationPermission,
    ).not.toHaveBeenCalled();
    expect(notificationService.getFCMToken).not.toHaveBeenCalled();
    expect(mockSetFcmToken).not.toHaveBeenCalled();
    expect(notificationService.registerDeviceToken).not.toHaveBeenCalled();
  });

  it('should handle missing sessionId gracefully', async () => {
    const routeWithoutUserId = {
      params: {},
    };

    (
      notificationService.requestNotificationPermission as jest.Mock
    ).mockResolvedValue(true);

    const { root } = render(<KycSuccessScreen route={routeWithoutUserId} />);

    const buttons = root.findAllByType('button');
    const receiveUpdatesButton = buttons[0]; // First button is "Receive live updates"
    fireEvent.press(receiveUpdatesButton);

    await waitFor(() => {
      // Verify notification permission was requested
      expect(
        notificationService.requestNotificationPermission,
      ).toHaveBeenCalledTimes(1);
    });

    // Verify FCM token was NOT fetched (no sessionId)
    expect(notificationService.getFCMToken).not.toHaveBeenCalled();

    await waitFor(() => {
      // Verify navigation to Home screen still happens
      expect(mockNavigate).toHaveBeenCalledWith('Home', {});
    });
  });

  it('renders fallback on render error', () => {
    // Mock console.error to suppress error boundary error logs during test
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Create a component that throws an error during render
    const ThrowError = () => {
      throw new Error('Test render error');
    };

    // Render the error-throwing component wrapped in ErrorBoundary
    const { root } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>,
    );

    // Verify the error boundary fallback UI is displayed
    // Use a more flexible matcher since the text is nested in mocked components
    expect(root.findByType('span').props.children).toBe(
      'Something went wrong. Please restart the app.',
    );

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
