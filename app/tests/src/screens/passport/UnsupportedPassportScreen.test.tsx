import { render } from '@testing-library/react-native';
import React from 'react';

import UnsupportedPassportScreen from '../../../../src/screens/passport/UnsupportedPassportScreen';
import {
  clearAnalyticsMocks,
  wasEventTrackedWithProps,
} from '../../../__setup__/mockAnalytics';

// Mock the LottieView component
jest.mock('lottie-react-native', () => {
  return function MockLottieView() {
    return null;
  };
});

// Mock the navigation hook
jest.mock('../../../../src/hooks/useHapticNavigation', () => {
  return jest.fn().mockImplementation(() => jest.fn());
});

// Mock haptic feedback
jest.mock('../../../../src/utils/haptic', () => ({
  notificationError: jest.fn(),
  notificationSuccess: jest.fn(),
  impactLight: jest.fn(),
  impactMedium: jest.fn(),
  selectionChange: jest.fn(),
}));

describe('UnsupportedPassportScreen', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    clearAnalyticsMocks();
  });

  it('should track unsupported passport event on mount', () => {
    // Render the component
    render(<UnsupportedPassportScreen />);

    // Verify event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Passport Unsupported', {
        flow_stage: 'verification_failed',
        reason: 'unsupported_passport',
      }),
    ).toBe(true);
  });
});
