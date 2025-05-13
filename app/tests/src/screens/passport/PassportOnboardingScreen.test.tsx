import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import PassportOnboardingScreen from '../../../../src/screens/passport/PassportOnboardingScreen';
import {
  clearAnalyticsMocks,
  wasEventTrackedWithProps,
} from '../../../__setup__/mockAnalytics';

// Mock the LottieView component
jest.mock('lottie-react-native', () => {
  // Return mock component that tracks play/pause calls
  const mockPlayFn = jest.fn();
  class MockAnimationView extends React.Component {
    play = mockPlayFn;
    render() {
      return null;
    }
  }
  return MockAnimationView;
});

// Mock the navigation hook
jest.mock('../../../../src/hooks/useHapticNavigation', () => {
  return jest.fn().mockImplementation(() => jest.fn());
});

describe('PassportOnboardingScreen', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    clearAnalyticsMocks();
  });

  it('should track open_camera action when primary button is pressed', async () => {
    // Render the component
    const { getByText } = render(<PassportOnboardingScreen />);

    // Find and press the "Open Camera" button
    fireEvent.press(getByText('Open Camera'));

    // Verify event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Passport Onboarding Action', {
        action: 'open_camera',
        flow_type: 'standard',
      }),
    ).toBe(true);
  });

  it('should track cancel action when secondary button is pressed', async () => {
    // Render the component
    const { getByText } = render(<PassportOnboardingScreen />);

    // Find and press the "Cancel" button
    fireEvent.press(getByText('Cancel'));

    // Verify event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Passport Onboarding Action', {
        action: 'cancel',
        flow_type: 'standard',
      }),
    ).toBe(true);
  });
});
