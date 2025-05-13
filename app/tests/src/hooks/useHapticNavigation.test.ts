import { useNavigation } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-native';
// Mock react-native-haptic-feedback's trigger function
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import useHapticNavigation from '../../../src/hooks/useHapticNavigation';
import {
  clearAnalyticsMocks,
  wasEventTrackedWithProps,
} from '../../__setup__/mockAnalytics';
const triggerHaptic = ReactNativeHapticFeedback.trigger as jest.Mock;

// Mock useNavigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

describe('useHapticNavigation', () => {
  // Mock navigator functions
  const mockNavigate = jest.fn();
  const mockPopTo = jest.fn();
  const mockGetCurrentRoute = jest.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    clearAnalyticsMocks();

    // Setup default navigation mock
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      popTo: mockPopTo,
      getCurrentRoute: mockGetCurrentRoute,
    });

    // Default current route
    mockGetCurrentRoute.mockReturnValue({ name: 'CurrentScreen' });
  });

  it('should track default navigation with correct properties', () => {
    // Render the hook with default action
    const { result } = renderHook(() => useHapticNavigation('TargetScreen'));

    // Call the navigation function
    result.current();

    // Check that analytics event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Navigation', {
        from_screen: 'CurrentScreen',
        to_screen: 'TargetScreen',
        action_type: 'default',
        has_params: false,
      }),
    ).toBe(true);

    // Verify navigation was called correctly
    expect(mockNavigate).toHaveBeenCalledWith('TargetScreen', undefined);

    // Verify haptic feedback was triggered (light impact for default)
    expect(triggerHaptic).toHaveBeenCalledWith('impactLight');
  });

  it('should track navigation with parameters', () => {
    // Render the hook with params
    const params = { id: '123', name: 'Test' };
    const { result } = renderHook(() =>
      useHapticNavigation('TargetScreen', { params }),
    );

    // Call the navigation function
    result.current();

    // Check that analytics event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Navigation', {
        from_screen: 'CurrentScreen',
        to_screen: 'TargetScreen',
        action_type: 'default',
        has_params: true,
      }),
    ).toBe(true);

    // Verify navigation was called with params
    expect(mockNavigate).toHaveBeenCalledWith('TargetScreen', params);
  });

  it('should track cancel navigation action', () => {
    // Render the hook with cancel action
    const { result } = renderHook(() =>
      useHapticNavigation('TargetScreen', { action: 'cancel' }),
    );

    // Call the navigation function
    result.current();

    // Check that analytics event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Navigation', {
        from_screen: 'CurrentScreen',
        to_screen: 'TargetScreen',
        action_type: 'cancel',
        has_params: false,
      }),
    ).toBe(true);

    // Verify popTo was called for cancel action
    expect(mockPopTo).toHaveBeenCalledWith('TargetScreen', undefined);
    expect(mockNavigate).not.toHaveBeenCalled();

    // Verify selection change haptic was triggered for cancel
    expect(triggerHaptic).toHaveBeenCalledWith('selection');
  });

  it('should track confirm navigation action', () => {
    // Render the hook with confirm action
    const { result } = renderHook(() =>
      useHapticNavigation('TargetScreen', { action: 'confirm' }),
    );

    // Call the navigation function
    result.current();

    // Check that analytics event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Navigation', {
        from_screen: 'CurrentScreen',
        to_screen: 'TargetScreen',
        action_type: 'confirm',
        has_params: false,
      }),
    ).toBe(true);

    // Verify navigation was called for confirm action
    expect(mockNavigate).toHaveBeenCalledWith('TargetScreen', undefined);

    // Verify medium impact haptic was triggered for confirm
    expect(triggerHaptic).toHaveBeenCalledWith('impactMedium');
  });

  it('should handle unknown current screen', () => {
    // Mock getCurrentRoute to return undefined
    mockGetCurrentRoute.mockReturnValue(undefined);

    // Render the hook
    const { result } = renderHook(() => useHapticNavigation('TargetScreen'));

    // Call the navigation function
    result.current();

    // Check that analytics event was tracked with "Unknown" for from_screen
    expect(
      wasEventTrackedWithProps('Navigation', {
        from_screen: 'Unknown',
        to_screen: 'TargetScreen',
        action_type: 'default',
        has_params: false,
      }),
    ).toBe(true);
  });

  it('should handle both params and action together', () => {
    // Render the hook with both params and confirm action
    const params = { id: '456' };
    const { result } = renderHook(() =>
      useHapticNavigation('TargetScreen', {
        params,
        action: 'confirm',
      }),
    );

    // Call the navigation function
    result.current();

    // Check that analytics event was tracked with correct properties
    expect(
      wasEventTrackedWithProps('Navigation', {
        from_screen: 'CurrentScreen',
        to_screen: 'TargetScreen',
        action_type: 'confirm',
        has_params: true,
      }),
    ).toBe(true);

    // Verify navigation was called with correct parameters
    expect(mockNavigate).toHaveBeenCalledWith('TargetScreen', params);

    // Verify medium impact haptic was triggered for confirm
    expect(triggerHaptic).toHaveBeenCalledWith('impactMedium');
  });
});
