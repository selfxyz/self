// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { render } from '@testing-library/react-native';

import KycSuccessScreen from '@/screens/kyc/KycSuccessScreen';
import * as notificationService from '@/services/notifications/notificationService';

jest.mock('react-native', () => {
  const MockView = ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  );
  const MockText = ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  );

  return {
    __esModule: true,
    Platform: { OS: 'ios', select: jest.fn() },
    Pressable: ({ onPress, children }: any) => (
      <button onClick={onPress} type="button">
        {children}
      </button>
    ),
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
    Text: MockText,
    View: MockView,
  };
});

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
jest.mock('tamagui', () => {
  const View: any = 'View';
  const Text: any = 'Text';
  const createViewComponent = (displayName: string) => {
    const MockComponent = ({ children, ...props }: any) => (
      <View {...props} testID={displayName}>
        {children}
      </View>
    );
    MockComponent.displayName = displayName;
    return MockComponent;
  };

  const MockYStack = createViewComponent('YStack');
  const MockView = createViewComponent('View');

  const MockText = ({ children, ...props }: any) => (
    <Text {...props}>{children}</Text>
  );
  MockText.displayName = 'Text';

  return {
    __esModule: true,
    YStack: MockYStack,
    View: MockView,
    Text: MockText,
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: () => null,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
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
});
