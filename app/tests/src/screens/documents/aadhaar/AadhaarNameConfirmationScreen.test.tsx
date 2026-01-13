// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AadhaarEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AadhaarNameConfirmationScreen from '@/screens/documents/aadhaar/AadhaarNameConfirmationScreen';
import { useAadhaarNameOptions } from '@/hooks/useAadhaarNameOptions';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/hooks', () => ({
  useSafeBottomPadding: jest.fn(() => 35),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    BodyText: (props: any) => <Text {...props}>{props.children}</Text>,
    PrimaryButton: (props: any) => (
      <TouchableOpacity onPress={props.onPress} disabled={props.disabled}>
        <Text>{props.children}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/hooks/useAadhaarNameOptions', () => ({
  useAadhaarNameOptions: jest.fn(),
}));

describe('AadhaarNameConfirmationScreen', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();

  const mockSelfClient = {
    trackEvent: mockTrackEvent,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });

    (useSelfClient as jest.Mock).mockReturnValue(mockSelfClient);

    (useAadhaarNameOptions as jest.Mock).mockReturnValue({
      loading: false,
      nameParts: ['John', 'Doe', 'Smith'],
      firstNameIndex: 0,
      lastNameIndex: 2,
    });
  });

  it('should render loading state', () => {
    (useAadhaarNameOptions as jest.Mock).mockReturnValue({
      loading: true,
      nameParts: [],
      firstNameIndex: -1,
      lastNameIndex: -1,
    });

    const { getByText } = render(<AadhaarNameConfirmationScreen />);

    expect(getByText('Loading Aadhaar data...')).toBeTruthy();
  });

  it('should render name confirmation with first and last name', () => {
    const { getByText } = render(<AadhaarNameConfirmationScreen />);

    expect(getByText('Is this correct?')).toBeTruthy();
    expect(getByText('John')).toBeTruthy();
    expect(getByText('Smith')).toBeTruthy();
  });

  it('should track CONTINUE_TO_REGISTRATION_PRESSED when continue button is pressed', async () => {
    const { getByText } = render(<AadhaarNameConfirmationScreen />);

    const continueButton = getByText('Continue');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        AadhaarEvents.CONTINUE_TO_REGISTRATION_PRESSED,
      );
    });
  });

  it('should navigate to AadhaarUploadSuccess when continue button is pressed', async () => {
    const { getByText } = render(<AadhaarNameConfirmationScreen />);

    const continueButton = getByText('Continue');
    fireEvent.press(continueButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('AadhaarUploadSuccess');
    });
  });

  it('should display correct section labels', () => {
    const { getByText } = render(<AadhaarNameConfirmationScreen />);

    expect(getByText('My first name is:')).toBeTruthy();
    expect(getByText('My last name is:')).toBeTruthy();
  });

  it('should display warning subtitle', () => {
    const { getAllByText } = render(<AadhaarNameConfirmationScreen />);

    const subtitleTexts = getAllByText(/Double check to make sure/);
    expect(subtitleTexts.length).toBeGreaterThan(0);
  });
});
