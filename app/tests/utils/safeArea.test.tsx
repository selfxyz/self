// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { act, render, renderHook } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

import { SafeAreaProvider, useSafeAreaInsets } from '../../src/utils/safeArea';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    isPad: false,
    isTV: false,
  },
  Dimensions: {
    get: jest.fn(),
    addEventListener: jest.fn(),
  },
  StatusBar: {
    currentHeight: undefined,
  },
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getApiLevel: jest.fn(),
}));

const mockDimensions = Dimensions.get as jest.Mock;
const mockStatusBar = StatusBar as jest.Mocked<typeof StatusBar>;
const mockDimensionsAddEventListener = Dimensions.addEventListener as jest.Mock;
const mockDeviceInfo = require('react-native-device-info');

describe('safeArea', () => {
  let originalPlatform: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalPlatform = Platform.OS;
    // Reset Platform properties
    Platform.OS = 'ios';
    (Platform as any).isPad = false;
    (Platform as any).isTV = false;
    mockStatusBar.currentHeight = undefined;

    // Mock dimension event listener
    mockDimensionsAddEventListener.mockReturnValue({
      remove: jest.fn(),
    });

    // Reset native modules mocks
    mockDeviceInfo.getApiLevel.mockResolvedValue(29);
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  describe('SafeAreaProvider', () => {
    it('should render children without any wrapper', () => {
      const TestComponent = () => (
        <SafeAreaProvider>Test Content</SafeAreaProvider>
      );
      const { UNSAFE_root } = render(<TestComponent />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render multiple children', () => {
      const TestComponent = () => (
        <SafeAreaProvider>
          <React.Fragment>First Child</React.Fragment>
          <React.Fragment>Second Child</React.Fragment>
        </SafeAreaProvider>
      );
      const { UNSAFE_root } = render(<TestComponent />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should render without children', () => {
      const { UNSAFE_root } = render(<SafeAreaProvider />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('useSafeAreaInsets', () => {
    describe('Android', () => {
      beforeEach(() => {
        Platform.OS = 'android';
      });

      it('should return StatusBar.currentHeight as top inset when available', () => {
        mockStatusBar.currentHeight = 24;
        mockDimensions.mockReturnValue({ height: 800, width: 400 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 24,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should return 0 as top inset when StatusBar.currentHeight is undefined', () => {
        mockStatusBar.currentHeight = undefined;
        mockDimensions.mockReturnValue({ height: 800, width: 400 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should not have bottom inset on Android', () => {
        mockStatusBar.currentHeight = 24;
        mockDimensions.mockReturnValue({ height: 900, width: 400 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current.bottom).toBe(0);
      });

      it('should enhance calculation for Android API 28+ with modern device dimensions', async () => {
        // Mock Android API 29 with tall device dimensions (modern phone with possible notch)
        mockDeviceInfo.getApiLevel.mockResolvedValue(29);
        mockStatusBar.currentHeight = 20; // Low status bar height
        mockDimensions.mockReturnValue({ height: 2400, width: 1080 }); // Tall aspect ratio

        const { result } = renderHook(() => useSafeAreaInsets());

        // Wait for the async Android calculation
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current).toEqual({
          top: 24, // Enhanced to minimum 24 for modern devices
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should fall back to StatusBar.currentHeight on Android API < 28', async () => {
        // Mock Android API 27 (below 28)
        mockDeviceInfo.getApiLevel.mockResolvedValue(27);
        mockStatusBar.currentHeight = 24;
        mockDimensions.mockReturnValue({ height: 800, width: 400 });

        const { result } = renderHook(() => useSafeAreaInsets());

        // Wait for the async Android calculation
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current).toEqual({
          top: 24,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should fall back to StatusBar.currentHeight when DeviceInfo.getApiLevel fails', async () => {
        // Mock DeviceInfo.getApiLevel to throw error
        mockDeviceInfo.getApiLevel.mockRejectedValue(
          new Error('DeviceInfo not available'),
        );
        mockStatusBar.currentHeight = 24;
        mockDimensions.mockReturnValue({ height: 800, width: 400 });

        const { result } = renderHook(() => useSafeAreaInsets());

        // Wait for the async Android calculation
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current).toEqual({
          top: 24,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });
    });

    describe('iOS without notch', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
        (Platform as any).isPad = false;
        (Platform as any).isTV = false;
      });

      it('should return classic iOS insets for iPhone 8 and earlier', () => {
        // iPhone 8 dimensions
        mockDimensions.mockReturnValue({ height: 667, width: 375 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should return classic iOS insets for iPhone SE (2nd gen)', () => {
        // iPhone SE dimensions
        mockDimensions.mockReturnValue({ height: 667, width: 375 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should work in landscape orientation', () => {
        // Landscape orientation (width > height)
        mockDimensions.mockReturnValue({ height: 375, width: 667 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });
    });

    describe('iOS with notch/Dynamic Island', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
        (Platform as any).isPad = false;
        (Platform as any).isTV = false;
      });

      it('should detect notch for iPhone X series (812x375)', () => {
        // iPhone X, XS, 11 Pro dimensions
        mockDimensions.mockReturnValue({ height: 812, width: 375 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });

      it('should detect notch for iPhone XR, 11 series (896x414)', () => {
        // iPhone XR, 11 dimensions
        mockDimensions.mockReturnValue({ height: 896, width: 414 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });

      it('should detect notch for iPhone 12 Pro Max, 13 Pro Max series (926x428)', () => {
        // iPhone 12 Pro Max, 13 Pro Max dimensions
        mockDimensions.mockReturnValue({ height: 926, width: 428 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });

      it('should detect notch for iPhone 12, 13, 14 series (844x390)', () => {
        // iPhone 12, 13, 14 dimensions
        mockDimensions.mockReturnValue({ height: 844, width: 390 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });

      it('should work in landscape orientation for notched devices', () => {
        // Landscape orientation (width > height) for iPhone X
        mockDimensions.mockReturnValue({ height: 375, width: 812 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });

      it('should handle edge case dimensions that barely meet notch criteria', () => {
        // Minimum dimensions for notch detection
        mockDimensions.mockReturnValue({ height: 812, width: 375 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });

      it('should not detect notch for dimensions just below threshold', () => {
        // Just below notch detection threshold
        mockDimensions.mockReturnValue({ height: 811, width: 374 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });
    });

    describe('iPad', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
        (Platform as any).isPad = true;
        (Platform as any).isTV = false;
      });

      it('should not detect notch on iPad even with large dimensions', () => {
        // iPad Pro 12.9" dimensions
        mockDimensions.mockReturnValue({ height: 1366, width: 1024 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should handle iPad in landscape orientation', () => {
        // iPad in landscape
        mockDimensions.mockReturnValue({ height: 1024, width: 1366 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });
    });

    describe('Apple TV', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
        (Platform as any).isPad = false;
        (Platform as any).isTV = true;
      });

      it('should not detect notch on Apple TV', () => {
        // Apple TV 4K dimensions
        mockDimensions.mockReturnValue({ height: 2160, width: 3840 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });
    });

    describe('Non-iOS platforms', () => {
      it('should handle unknown platforms gracefully', () => {
        Platform.OS = 'windows' as any;
        mockDimensions.mockReturnValue({ height: 800, width: 400 });

        const { result } = renderHook(() => useSafeAreaInsets());

        // Note: Current implementation falls through to iOS logic for non-Android platforms
        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });
    });

    describe('memoization', () => {
      beforeEach(() => {
        Platform.OS = 'ios';
        (Platform as any).isPad = false;
        (Platform as any).isTV = false;
      });

      it('should memoize results when dimensions do not change', () => {
        mockDimensions.mockReturnValue({ height: 812, width: 375 });

        const { result, rerender } = renderHook(() => useSafeAreaInsets());
        const firstResult = result.current;

        rerender({});
        const secondResult = result.current;

        expect(firstResult).toBe(secondResult);
      });

      it('should recalculate when dimensions change', async () => {
        // Mock dimension changes to simulate device rotation
        let mockDimensionsCall = 0;
        mockDimensions.mockImplementation(() => {
          mockDimensionsCall++;
          return mockDimensionsCall === 1
            ? { height: 667, width: 375 } // iPhone 8 dimensions (no notch)
            : { height: 812, width: 375 }; // iPhone X dimensions (with notch)
        });

        const { result } = renderHook(() => useSafeAreaInsets());
        const firstResult = result.current;

        // Initial result should be for iPhone 8 (no notch)
        expect(firstResult.top).toBe(20);
        expect(firstResult.bottom).toBe(0);

        // Simulate dimension change event
        const dimensionChangeCallback =
          mockDimensionsAddEventListener.mock.calls[0][1];

        await act(async () => {
          dimensionChangeCallback();
        });

        const secondResult = result.current;
        // After dimension change, should detect notch and update insets
        expect(secondResult.top).toBe(44);
        expect(secondResult.bottom).toBe(34);
      });
    });

    describe('edge cases', () => {
      it('should handle zero dimensions gracefully', () => {
        Platform.OS = 'ios';
        mockDimensions.mockReturnValue({ height: 0, width: 0 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should handle negative dimensions gracefully', () => {
        Platform.OS = 'ios';
        mockDimensions.mockReturnValue({ height: -100, width: -50 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 20,
          bottom: 0,
          left: 0,
          right: 0,
        });
      });

      it('should handle extremely large dimensions', () => {
        Platform.OS = 'ios';
        mockDimensions.mockReturnValue({ height: 999999, width: 999999 });

        const { result } = renderHook(() => useSafeAreaInsets());

        expect(result.current).toEqual({
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        });
      });
    });
  });
});
