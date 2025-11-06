// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';

import GratificationScreen from '@/screens/app/GratificationScreen';
import { useReferralRegistration } from '@/hooks/useReferralRegistration';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('@/hooks/useReferralRegistration');

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: ({ onAnimationFinish }: any) => {
    React.useEffect(() => {
      // Simulate animation finishing immediately
      setTimeout(() => {
        onAnimationFinish?.();
      }, 0);
    }, [onAnimationFinish]);
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
const mockUseReferralRegistration = useReferralRegistration as jest.MockedFunction<
  typeof useReferralRegistration
>;

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

    // Mock the hook to do nothing by default
    mockUseReferralRegistration.mockImplementation(() => {});
  });

  it('should call useReferralRegistration hook', () => {
    render(<GratificationScreen />);

    expect(mockUseReferralRegistration).toHaveBeenCalled();
  });

  it('should use default points value when not provided', () => {
    mockUseRoute.mockReturnValue({
      params: {},
    } as any);

    const { getByText } = render(<GratificationScreen />);

    expect(getByText('0')).toBeTruthy();
  });

  it('should use custom points value when provided', () => {
    mockUseRoute.mockReturnValue({
      params: { points: 50 },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    expect(getByText('50')).toBeTruthy();
  });

  it('should use points value when both points and referrer are provided', () => {
    mockUseRoute.mockReturnValue({
      params: { points: 24, referrer: '0x1234567890123456789012345678901234567890' },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    expect(getByText('24')).toBeTruthy();
  });

  it('should display referral points value (24) when passed', () => {
    mockUseRoute.mockReturnValue({
      params: { points: 24 },
    } as any);

    const { getByText } = render(<GratificationScreen />);

    expect(getByText('24')).toBeTruthy();
  });
});
