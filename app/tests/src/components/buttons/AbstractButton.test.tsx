import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import AbstractButton from '../../../../src/components/buttons/AbstractButton';
import { navigationRef } from '../../../../src/navigation';
import {
  clearAnalyticsMocks,
  wasEventTrackedWithProps,
} from '../../../__setup__/mockAnalytics';

// Mock navigation ref
jest.mock('../../../../src/navigation', () => ({
  navigationRef: {
    getCurrentRoute: jest.fn(),
  },
}));

describe('AbstractButton', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    clearAnalyticsMocks();

    // Default mock implementation
    (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue({
      name: 'TestScreen',
    });
  });

  it('should track button press with correct primary button properties', () => {
    // Render a primary button (non-transparent background)
    const onPressMock = jest.fn();
    const { getByText } = render(
      <AbstractButton bgColor="blue" color="white" onPress={onPressMock}>
        Test Button
      </AbstractButton>,
    );

    // Simulate button press
    fireEvent.press(getByText('Test Button'));

    // Verify that the event was tracked with the correct properties
    expect(
      wasEventTrackedWithProps('Button Press', {
        screen: 'TestScreen',
        button_text: 'Test Button',
        button_type: 'Primary',
        disabled: false,
      }),
    ).toBe(true);

    // Verify the original onPress was called
    expect(onPressMock).toHaveBeenCalled();
  });

  it('should track button press with correct secondary button properties', () => {
    // Render a secondary button (transparent background)
    const onPressMock = jest.fn();
    const { getByText } = render(
      <AbstractButton bgColor="transparent" color="blue" onPress={onPressMock}>
        Cancel
      </AbstractButton>,
    );

    // Simulate button press
    fireEvent.press(getByText('Cancel'));

    // Verify that the event was tracked with the correct properties
    expect(
      wasEventTrackedWithProps('Button Press', {
        screen: 'TestScreen',
        button_text: 'Cancel',
        button_type: 'Secondary',
        disabled: false,
      }),
    ).toBe(true);

    // Verify the original onPress was called
    expect(onPressMock).toHaveBeenCalled();
  });

  it('should track button press with disabled state', () => {
    // Render a disabled button
    const onPressMock = jest.fn();
    const { getByText } = render(
      <AbstractButton
        bgColor="blue"
        color="white"
        onPress={onPressMock}
        disabled={true}
      >
        Disabled Button
      </AbstractButton>,
    );

    // Simulate button press
    fireEvent.press(getByText('Disabled Button'));

    // Verify that the event was tracked with the correct properties
    expect(
      wasEventTrackedWithProps('Button Press', {
        screen: 'TestScreen',
        button_text: 'Disabled Button',
        button_type: 'Primary',
        disabled: true,
      }),
    ).toBe(true);

    // Verify the original onPress was called (even though button is disabled, the event handler is still called in the test environment)
    expect(onPressMock).toHaveBeenCalled();
  });

  it('should handle buttons with non-string children', () => {
    // Render a button with complex children
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <AbstractButton
        bgColor="blue"
        color="white"
        onPress={onPressMock}
        testID="complex-button"
      >
        <Text>Child 1</Text>
        <Text>Child 2</Text>
      </AbstractButton>,
    );

    // Simulate button press
    fireEvent.press(getByTestId('complex-button'));

    // Verify that the event was tracked with the correct properties
    expect(
      wasEventTrackedWithProps('Button Press', {
        screen: 'TestScreen',
        button_text: 'Unknown', // For complex children, it should use "Unknown"
        button_type: 'Primary',
        disabled: false,
      }),
    ).toBe(true);

    // Verify the original onPress was called
    expect(onPressMock).toHaveBeenCalled();
  });

  it('should handle unknown screen for tracking context', () => {
    // Mock navigation to return undefined for current route
    (navigationRef.getCurrentRoute as jest.Mock).mockReturnValue(undefined);

    const onPressMock = jest.fn();
    const { getByText } = render(
      <AbstractButton bgColor="blue" color="white" onPress={onPressMock}>
        Test Button
      </AbstractButton>,
    );

    // Simulate button press
    fireEvent.press(getByText('Test Button'));

    // Verify that the event was tracked with "Unknown" screen
    expect(
      wasEventTrackedWithProps('Button Press', {
        screen: 'Unknown',
        button_text: 'Test Button',
        button_type: 'Primary',
        disabled: false,
      }),
    ).toBe(true);
  });
});
