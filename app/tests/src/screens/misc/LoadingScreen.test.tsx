// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { render } from '@testing-library/react-native';
import React from 'react';

import LoadingScreen from '../../../../src/screens/misc/LoadingScreen';
import { useProvingStore } from '../../../../src/utils/proving/provingMachine';

// Mock the proving store
jest.mock('../../../../src/utils/proving/provingMachine');

// Mock other dependencies
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

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
    it('should handle DSC circuit type correctly', () => {
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
      expect(getLoadingScreenText).toHaveBeenCalledWith(
        'proving',
        expect.any(Object),
        'dsc',
      );
    });

    it('should handle register circuit type correctly', () => {
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
      expect(getLoadingScreenText).toHaveBeenCalledWith(
        'proving',
        expect.any(Object),
        'register',
      );
    });

    it('should handle disclose circuit type correctly', () => {
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
      expect(getLoadingScreenText).toHaveBeenCalledWith(
        'proving',
        expect.any(Object),
        'register',
      );
    });

    it('should default to register type when circuit type is null', () => {
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
      expect(getLoadingScreenText).toHaveBeenCalledWith(
        'proving',
        expect.any(Object),
        'register',
      );
    });
  });
});
