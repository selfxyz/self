// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';

import GratificationScreen from '@/screens/app/GratificationScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

// Mock Tamagui components to avoid theme provider requirement
jest.mock('tamagui', () => {
  const React = require('react');
  const { View: RNView, Text: RNText } = require('react-native');
  return {
    YStack: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(RNView, { ref, ...props }, children),
    ),
    Text: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(RNText, { ref, ...props }, children),
    ),
    View: React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(RNView, { ref, ...props }, children),
    ),
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: ({ onAnimationFinish }: any) => {
    // Simulate animation finishing immediately
    setTimeout(() => {
      onAnimationFinish?.();
    }, 0);
    return null;
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  PrimaryButton: ({ children, onPress }: any) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

jest.mock('@/images/icons/arrow_left.svg', () => 'ArrowLeft');
jest.mock('@/images/icons/logo_white.svg', () => 'LogoWhite');

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

describe('GratificationScreen', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    } as any);

    mockUseRoute.mockReturnValue({
      params: {},
    } as any);
  });

  it('should use default points value when not provided', async () => {
    mockUseRoute.mockReturnValue({
      params: {},
    } as any);

    const { getByText } = render(<GratificationScreen />);

    await waitFor(() => {
      expect(getByText('0')).toBeTruthy();
    });
  });

  it('should use custom points value when provided', async () => {
    mockUseRoute.mockReturnValue({
      params: { points: 50 },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    await waitFor(() => {
      expect(getByText('50')).toBeTruthy();
    });
  });

  it('should display referral points value (24) when passed', async () => {
    mockUseRoute.mockReturnValue({
      params: { points: 24 },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    await waitFor(() => {
      expect(getByText('24')).toBeTruthy();
    });
  });
});
