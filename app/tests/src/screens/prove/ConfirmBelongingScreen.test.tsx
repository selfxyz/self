import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import ConfirmBelongingScreen from '../../../../src/screens/prove/ConfirmBelongingScreen';
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

// Mock the proving store
const mockSetUserConfirmed = jest.fn();
jest.mock('../../../../src/utils/proving/provingMachine', () => ({
  useProvingStore: jest.fn(selector => {
    // If a selector function is provided, return the selected state
    if (typeof selector === 'function') {
      // Mock the currentState for testing
      return selector({ currentState: 'ready_to_prove' });
    }

    // Otherwise return the store methods
    return {
      init: jest.fn(),
      setUserConfirmed: mockSetUserConfirmed,
      currentState: 'ready_to_prove',
    };
  }),
}));

// Mock usePreventRemove from React Navigation
jest.mock('@react-navigation/native', () => ({
  usePreventRemove: jest.fn(),
  StaticScreenProps: jest.fn(),
}));

// Mock haptic feedback
jest.mock('../../../../src/utils/haptic', () => ({
  notificationError: jest.fn(),
  notificationSuccess: jest.fn(),
  impactLight: jest.fn(),
  impactMedium: jest.fn(),
  selectionChange: jest.fn(),
}));

describe('ConfirmBelongingScreen', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    clearAnalyticsMocks();
  });

  it('should track passport flow completed event on mount', () => {
    // Render the component with default props (no mock flow)
    render(<ConfirmBelongingScreen route={{}} />);

    // Verify event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Passport Flow Completed', {
        flow_stage: 'passport_verification_completed',
        is_mock_flow: false,
      }),
    ).toBe(true);
  });

  it('should track passport flow completed with mock flow param', () => {
    // Render the component with mock flow param
    render(
      <ConfirmBelongingScreen route={{ params: { mockPassportFlow: true } }} />,
    );

    // Verify event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Passport Flow Completed', {
        flow_stage: 'passport_verification_completed',
        is_mock_flow: true,
      }),
    ).toBe(true);
  });

  it('should track identity confirmation when button is pressed', () => {
    // Render the component
    const { getByText } = render(<ConfirmBelongingScreen route={{}} />);

    // Find and press the "Confirm" button
    fireEvent.press(getByText('Confirm'));

    // Verify event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Passport Identity Confirmed', {
        is_ready_to_prove: true,
        is_mock_flow: false,
      }),
    ).toBe(true);

    // Verify proving store function was called
    expect(mockSetUserConfirmed).toHaveBeenCalled();
  });

  it('should handle error in proving process', async () => {
    // Mock an error in setUserConfirmed
    mockSetUserConfirmed.mockImplementation(() => {
      throw new Error('Test error');
    });

    // Silence the console.error that will be called
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Render the component
    const { getByText } = render(<ConfirmBelongingScreen route={{}} />);

    // Find and press the "Confirm" button
    fireEvent.press(getByText('Confirm'));

    // Verify error event was tracked
    expect(
      wasEventTrackedWithProps('Passport Proving Error', {
        error: 'Test error',
        is_mock_flow: false,
      }),
    ).toBe(true);
  });
});
