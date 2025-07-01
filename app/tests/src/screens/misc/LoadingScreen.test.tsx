// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import LoadingScreen from '../../../../src/screens/misc/LoadingScreen';
import { useProvingStore } from '../../../../src/utils/proving/provingMachine';

// Mock the proving store
jest.mock('../../../../src/utils/proving/provingMachine');

// Mock other dependencies
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  createNavigationContainerRef: jest.fn(() => ({
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
    getCurrentRoute: jest.fn(() => ({ name: 'TestScreen' })),
  })),
  createStaticNavigation: jest.fn(() => jest.fn()),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({})),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

jest.mock('lottie-react-native', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

jest.mock('tamagui', () => ({
  YStack: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  styled: jest.fn(
    () =>
      ({ children }: any) =>
        children,
  ),
}));

jest.mock('../../../../src/hooks/useHapticNavigation', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../src/utils/haptic', () => ({
  loadingScreenProgress: jest.fn(),
}));

// Mock SVG imports
jest.mock(
  '../../../../src/images/icons/close-warning.svg',
  () => 'CloseWarningIcon',
);

jest.mock('../../../../src/utils/proving/loadingScreenStateText', () => ({
  getLoadingScreenText: jest.fn().mockReturnValue({
    actionText: 'Test Action',
    estimatedTime: 'Test Time',
  }),
}));

jest.mock('../../../../src/providers/passportDataProvider', () => ({
  loadPassportDataAndSecret: jest.fn().mockResolvedValue(
    JSON.stringify({
      passportData: {
        passportMetadata: {
          signatureAlgorithm: 'RSA',
          curveOrExponent: '65537',
        },
      },
    }),
  ),
  clearPassportData: jest.fn(),
}));

jest.mock('../../../../src/utils/notifications/notificationService', () => ({
  setupNotifications: jest.fn().mockReturnValue(() => {}),
}));

jest.mock('../../../../src/utils/proving/validateDocument', () => ({
  checkPassportSupported: jest
    .fn()
    .mockResolvedValue({ status: 'passport_supported' }),
}));

const mockUseProvingStore = useProvingStore as unknown as jest.MockedFunction<
  typeof useProvingStore
>;

describe('LoadingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Circuit type handling', () => {
    it('should handle DSC circuit type correctly', async () => {
      // Mock proving store state for DSC flow
      mockUseProvingStore.mockImplementation(selector => {
        if (typeof selector === 'function') {
          return selector({
            currentState: 'proving',
            fcmToken: 'test-token',
            circuitType: 'dsc',
            // Add other required state properties
          } as any);
        }
        return {
          currentState: 'proving',
          fcmToken: 'test-token',
          circuitType: 'dsc',
        } as any;
      });

      // Mock getState to return DSC circuit type
      (mockUseProvingStore as any).getState = jest.fn().mockReturnValue({
        circuitType: 'dsc',
      });

      const {
        getLoadingScreenText,
      } = require('../../../../src/utils/proving/loadingScreenStateText');

      render(<LoadingScreen route={{} as any} />);

      // Verify that getLoadingScreenText was called with 'dsc' type
      await waitFor(() => {
        expect(getLoadingScreenText).toHaveBeenCalledWith(
          'proving',
          expect.any(Object),
          'dsc',
        );
      });
    });

    it('should handle register circuit type correctly', async () => {
      // Mock proving store state for register flow
      mockUseProvingStore.mockImplementation(selector => {
        if (typeof selector === 'function') {
          return selector({
            currentState: 'proving',
            fcmToken: 'test-token',
            circuitType: 'register',
          } as any);
        }
        return {
          currentState: 'proving',
          fcmToken: 'test-token',
          circuitType: 'register',
        } as any;
      });

      // Mock getState to return register circuit type
      (mockUseProvingStore as any).getState = jest.fn().mockReturnValue({
        circuitType: 'register',
      });

      const {
        getLoadingScreenText,
      } = require('../../../../src/utils/proving/loadingScreenStateText');

      render(<LoadingScreen route={{} as any} />);

      // Verify that getLoadingScreenText was called with 'register' type
      await waitFor(() => {
        expect(getLoadingScreenText).toHaveBeenCalledWith(
          'proving',
          expect.any(Object),
          'register',
        );
      });
    });

    it('should handle disclose circuit type correctly', async () => {
      // Mock proving store state for disclose flow
      mockUseProvingStore.mockImplementation(selector => {
        if (typeof selector === 'function') {
          return selector({
            currentState: 'proving',
            fcmToken: 'test-token',
            circuitType: 'disclose',
          } as any);
        }
        return {
          currentState: 'proving',
          fcmToken: 'test-token',
          circuitType: 'disclose',
        } as any;
      });

      // Mock getState to return disclose circuit type
      (mockUseProvingStore as any).getState = jest.fn().mockReturnValue({
        circuitType: 'disclose',
      });

      const {
        getLoadingScreenText,
      } = require('../../../../src/utils/proving/loadingScreenStateText');

      render(<LoadingScreen route={{} as any} />);

      // Verify that getLoadingScreenText was called with 'register' type (disclose uses register timing)
      await waitFor(() => {
        expect(getLoadingScreenText).toHaveBeenCalledWith(
          'proving',
          expect.any(Object),
          'register',
        );
      });
    });

    it('should default to register type when circuit type is null', async () => {
      // Mock proving store state with null circuit type
      mockUseProvingStore.mockImplementation(selector => {
        if (typeof selector === 'function') {
          return selector({
            currentState: 'proving',
            fcmToken: 'test-token',
            circuitType: null,
          } as any);
        }
        return {
          currentState: 'proving',
          fcmToken: 'test-token',
          circuitType: null,
        } as any;
      });

      // Mock getState to return null circuit type
      (mockUseProvingStore as any).getState = jest.fn().mockReturnValue({
        circuitType: null,
      });

      const {
        getLoadingScreenText,
      } = require('../../../../src/utils/proving/loadingScreenStateText');

      render(<LoadingScreen route={{} as any} />);

      // Verify that getLoadingScreenText was called with 'register' type as default
      await waitFor(() => {
        expect(getLoadingScreenText).toHaveBeenCalledWith(
          'proving',
          expect.any(Object),
          'register',
        );
      });
    });
  });
});
