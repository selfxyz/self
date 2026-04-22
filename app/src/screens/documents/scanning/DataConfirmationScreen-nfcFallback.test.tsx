// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DataConfirmationScreen from '@/screens/documents/scanning/DataConfirmationScreen';

jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: () => ({
    useMRZStore: () => ({
      passportNumber: 'AB123456C',
      dateOfBirth: '900101',
      dateOfExpiry: '301231',
      countryCode: 'USA',
      documentType: 'P',
      setMRZForNFC: jest.fn(),
    }),
  }),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TouchableOpacity, Text } = require('react-native');
  return {
    PrimaryButton: ({
      children,
      onPress,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
    }) => (
      <TouchableOpacity onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
    SecondaryButton: ({
      children,
      onPress,
      disabled,
    }: {
      children: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
    }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Text>{children}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/components/InputField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return {
    InputField: ({ label, value }: { label: string; value?: string }) => {
      const testId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
      return (
        <View testID={testId}>
          <Text>{value}</Text>
        </View>
      );
    },
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  PassportEvents: {
    DATA_CONFIRMATION_COMPLETED: 'Passport: Data Confirmation Completed',
  },
}));

const mockNavigate = jest.fn();

let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('@/hooks/useHapticNavigation', () => jest.fn(() => jest.fn()));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockLaunchKycVerification = jest.fn();

jest.mock('@/hooks/useKycLauncher', () => ({
  useKycLauncher: () => ({
    launchKycVerification: mockLaunchKycVerification,
    showKycFallbackModal: jest.fn(),
    isLoading: false,
  }),
}));

describe('DataConfirmationScreen - NFC failure fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
  });

  it('does not show fallback button on happy path', () => {
    mockRouteParams = undefined;
    render(<DataConfirmationScreen />);

    expect(screen.queryByText('Try Alternative Verification')).toBeNull();
  });

  it('does not show fallback button when fromNfcFailure is false', () => {
    mockRouteParams = { fromNfcFailure: false };
    render(<DataConfirmationScreen />);

    expect(screen.queryByText('Try Alternative Verification')).toBeNull();
  });

  it('shows fallback button when fromNfcFailure is true', () => {
    mockRouteParams = { fromNfcFailure: true };
    render(<DataConfirmationScreen />);

    expect(screen.getByText('Try Alternative Verification')).toBeTruthy();
  });

  it('launches KYC verification when fallback button is pressed', () => {
    mockRouteParams = { fromNfcFailure: true };
    render(<DataConfirmationScreen />);

    fireEvent.press(screen.getByText('Try Alternative Verification'));

    expect(mockLaunchKycVerification).toHaveBeenCalled();
  });
});
