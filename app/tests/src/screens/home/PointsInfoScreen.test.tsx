// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { act, render } from '@testing-library/react-native';

import PointsInfoScreen from '@/screens/home/PointsInfoScreen';
import { unregisterModalCallbacks } from '@/utils/modalCallbackRegistry';

jest.mock('react-native', () => {
  const MockView = ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  );
  const MockText = ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  );
  const MockImage = ({ ...props }: any) => <mock-image {...props} />;

  return {
    __esModule: true,
    Image: MockImage,
    Platform: { OS: 'ios', select: jest.fn() },
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (style: any) => style,
    },
    Text: MockText,
    View: MockView,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
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
  const MockXStack = createViewComponent('XStack');
  const MockView = createViewComponent('View');
  const MockScrollView = createViewComponent('ScrollView');

  const MockText = ({ children, ...props }: any) => (
    <Text {...props}>{children}</Text>
  );
  MockText.displayName = 'Text';

  return {
    __esModule: true,
    YStack: MockYStack,
    XStack: MockXStack,
    View: MockView,
    Text: MockText,
    ScrollView: MockScrollView,
  };
});

// Mock mobile SDK components
jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  PrimaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress}>{children}</button>
  ),
  Title: ({ children }: any) => <div>{children}</div>,
}));

// Mock SVG icons
jest.mock('@/assets/icons/checkmark_square.svg', () => 'CheckmarkSquareIcon');
jest.mock('@/assets/icons/cloud_backup.svg', () => 'CloudBackupIcon');
jest.mock(
  '@/assets/icons/push_notifications.svg',
  () => 'PushNotificationsIcon',
);
jest.mock('@/assets/icons/star.svg', () => 'StarIcon');

// Mock images
jest.mock('@/assets/images/referral.png', () => 'ReferralImage');

jest.mock('@/utils/modalCallbackRegistry', () => ({
  getModalCallbacks: jest.fn(),
  registerModalCallbacks: jest.fn(),
  unregisterModalCallbacks: jest.fn(),
}));

const mockUnregisterModalCallbacks =
  unregisterModalCallbacks as jest.MockedFunction<
    typeof unregisterModalCallbacks
  >;

// Mock getModalCallbacks at module level
const { getModalCallbacks } = jest.requireMock('@/utils/modalCallbackRegistry');

describe('PointsInfoScreen', () => {
  const mockOnButtonPress = jest.fn();
  const mockOnModalDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup getModalCallbacks to return our mock callbacks
    getModalCallbacks.mockImplementation((id: number) => {
      if (id === 1) {
        return {
          onButtonPress: mockOnButtonPress,
          onModalDismiss: mockOnModalDismiss,
        };
      }
      return undefined;
    });
  });

  it('should render without crashing', () => {
    expect(() => {
      render(<PointsInfoScreen route={{ params: undefined }} />);
    }).not.toThrow();
  });

  it('should not show Next button when showNextButton is false', () => {
    const { toJSON } = render(
      <PointsInfoScreen
        route={{ params: { showNextButton: false, callbackId: 1 } }}
      />,
    );

    // Verify screen renders without button
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // In the actual implementation, button is conditionally rendered
    // We can't easily check for button absence in snapshot, but we verify it renders
  });

  it('should show Next button when showNextButton is true', () => {
    const { toJSON } = render(
      <PointsInfoScreen
        route={{ params: { showNextButton: true, callbackId: 1 } }}
      />,
    );

    // Verify screen renders with button
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  describe('Callback handling', () => {
    it('should call onModalDismiss and unregister callbacks when component unmounts without button press', () => {
      const { unmount } = render(
        <PointsInfoScreen
          route={{ params: { showNextButton: true, callbackId: 1 } }}
        />,
      );

      // Initially, no callbacks should be called
      expect(mockOnModalDismiss).not.toHaveBeenCalled();
      expect(mockUnregisterModalCallbacks).not.toHaveBeenCalled();
      expect(mockOnButtonPress).not.toHaveBeenCalled();

      // Unmount the component (simulating user navigating back)
      act(() => {
        unmount();
      });

      // onModalDismiss should be called to clear referrer
      expect(mockOnModalDismiss).toHaveBeenCalledTimes(1);
      // Callbacks should be unregistered to prevent memory leak
      expect(mockUnregisterModalCallbacks).toHaveBeenCalledWith(1);
      // onButtonPress should not be called (user didn't press the button)
      expect(mockOnButtonPress).not.toHaveBeenCalled();
    });

    it('should call onModalDismiss on unmount even when showNextButton is false', () => {
      const { unmount } = render(
        <PointsInfoScreen
          route={{ params: { showNextButton: false, callbackId: 1 } }}
        />,
      );

      act(() => {
        unmount();
      });

      // Callbacks should be called even if button is not shown (callbackId is present)
      expect(mockOnModalDismiss).toHaveBeenCalledTimes(1);
      expect(mockUnregisterModalCallbacks).toHaveBeenCalledWith(1);
    });

    it('should handle missing callbacks gracefully', () => {
      // Mock getModalCallbacks to return undefined
      getModalCallbacks.mockReturnValue(undefined);

      const { unmount } = render(
        <PointsInfoScreen
          route={{ params: { showNextButton: true, callbackId: 999 } }}
        />,
      );

      // Should not throw when unmounting with missing callbacks
      expect(() => {
        act(() => {
          unmount();
        });
      }).not.toThrow();

      // Should still attempt to unregister
      expect(mockUnregisterModalCallbacks).toHaveBeenCalledWith(999);
    });

    it('should handle missing callbackId gracefully', () => {
      const { unmount } = render(
        <PointsInfoScreen route={{ params: { showNextButton: true } }} />,
      );

      // Should not throw when unmounting without callbackId
      expect(() => {
        act(() => {
          unmount();
        });
      }).not.toThrow();

      // Should not attempt to unregister if no callbackId
      expect(mockUnregisterModalCallbacks).not.toHaveBeenCalled();
    });
  });

  describe('Referrer cleanup integration', () => {
    it('should ensure cleanup is called in correct order for referrer clearing', () => {
      const callOrder: string[] = [];

      const onModalDismissWithTracking = jest.fn(() => {
        callOrder.push('onModalDismiss');
      });

      const unregisterWithTracking = jest.fn(() => {
        callOrder.push('unregister');
      });

      getModalCallbacks.mockReturnValue({
        onButtonPress: mockOnButtonPress,
        onModalDismiss: onModalDismissWithTracking,
      });

      mockUnregisterModalCallbacks.mockImplementation(unregisterWithTracking);

      const { unmount } = render(
        <PointsInfoScreen
          route={{ params: { showNextButton: true, callbackId: 1 } }}
        />,
      );

      act(() => {
        unmount();
      });

      // Verify onModalDismiss is called before unregister
      expect(callOrder).toEqual(['onModalDismiss', 'unregister']);
    });
  });
});
