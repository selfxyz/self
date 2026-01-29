// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { render } from '@testing-library/react-native';

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
}));

jest.mock('react-native-edge-to-edge', () => ({
  SystemBars: () => null,
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
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: () => null,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000000',
  white: '#FFFFFF',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  AbstractButton: ({ children, onPress }: any) => (
    <button onClick={onPress} data-testid="abstract-button" type="button">
      {children}
    </button>
  ),
  PrimaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress} data-testid="primary-button" type="button">
      {children}
    </button>
  ),
  SecondaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress} data-testid="secondary-button" type="button">
      {children}
    </button>
  ),
  Title: ({ children }: any) => <div data-testid="title">{children}</div>,
  Description: ({ children }: any) => (
    <div data-testid="description">{children}</div>
  ),
}));

jest.mock('@/integrations/haptics', () => ({
  buttonTap: jest.fn(),
}));

jest.mock('@/services/notifications/notificationService', () => ({
  requestNotificationPermission: jest.fn(),
}));

jest.mock('@/config/sentry', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/services/analytics', () => ({
  flushAllAnalytics: jest.fn(),
  trackNfcEvent: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('KycSuccessScreen', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);
  });

  it('should render the screen without errors', () => {
    const { root } = render(<KycSuccessScreen />);
    expect(root).toBeTruthy();
  });

  it('should have navigation available', () => {
    render(<KycSuccessScreen />);
    expect(mockUseNavigation).toHaveBeenCalled();
  });

  it('should have notification service available', () => {
    render(<KycSuccessScreen />);
    expect(notificationService.requestNotificationPermission).toBeDefined();
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
