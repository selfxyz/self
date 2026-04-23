// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as mockReact from 'react';
import { Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import DataConfirmationScreen from '@/screens/documents/scanning/DataConfirmationScreen';
import * as analytics from '@/services/analytics';

const mockView = View;
const mockText = Text;

jest.mock('@/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

const mockSetMRZForNFC = jest.fn();

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: () => ({
    useMRZStore: () => ({
      passportNumber: 'AB123456C',
      dateOfBirth: '900101',
      dateOfExpiry: '301231',
      countryCode: 'USA',
      documentType: 'P',
      setMRZForNFC: mockSetMRZForNFC,
    }),
  }),
}));

const mockInputFieldCallbacks: Record<
  string,
  { onChangeText?: (text: string) => void }
> = {};

jest.mock('@/components/InputField', () => ({
  InputField: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value?: string;
    onChangeText?: (text: string) => void;
  }) => {
    const testId = `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    mockInputFieldCallbacks[testId] = { onChangeText };
    return mockReact.createElement(
      mockView,
      { testID: testId },
      mockReact.createElement(
        mockText,
        { testID: `input-value-${testId}` },
        value,
      ),
    );
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  PassportEvents: {
    DATA_CONFIRMATION_CONTINUE: 'Passport: Data Confirmation Continue',
    DATA_CONFIRMATION_CANCEL: 'Passport: Data Confirmation Cancel',
    DATA_CONFIRMATION_COMPLETED: 'Passport: Data Confirmation Completed',
  },
}));

const mockNavigate = jest.fn();
const mockNavigateToHome = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@/hooks/useHapticNavigation', () =>
  jest.fn(() => mockNavigateToHome),
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

function changeDocumentNumber(value: string) {
  const cb = mockInputFieldCallbacks['input-document-number']?.onChangeText;
  if (!cb) throw new Error('Document number onChangeText not found');
  act(() => cb(value));
}

describe('DataConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with initial MRZ data', () => {
    render(<DataConfirmationScreen />);

    expect(
      screen.getByText('Please confirm the following information'),
    ).toBeTruthy();
    expect(screen.getByTestId('input-document-number')).toBeTruthy();
    expect(screen.getByTestId('input-date-of-birth')).toBeTruthy();
    expect(screen.getByTestId('input-document-expiration-date')).toBeTruthy();
  });

  it('navigates to NFC scan screen on confirm', () => {
    render(<DataConfirmationScreen />);

    fireEvent.press(screen.getByText('Continue'));

    expect(mockNavigate).toHaveBeenCalledWith('DocumentNFCScan');
  });

  it('navigates to home screen on cancel', () => {
    render(<DataConfirmationScreen />);

    fireEvent.press(screen.getByTestId('escape-button'));

    expect(mockNavigateToHome).toHaveBeenCalled();
  });

  describe('MRZ data on confirm without changes', () => {
    it('does not call setMRZForNFC', () => {
      render(<DataConfirmationScreen />);

      fireEvent.press(screen.getByText('Continue'));

      expect(mockSetMRZForNFC).not.toHaveBeenCalled();
    });

    it('tracks confirmation with had_changes false', () => {
      render(<DataConfirmationScreen />);

      fireEvent.press(screen.getByText('Continue'));

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'Passport: Data Confirmation Completed',
        { had_changes: false },
      );
    });
  });

  describe('MRZ data on confirm with document number change', () => {
    it('calls setMRZForNFC with modified document number', () => {
      render(<DataConfirmationScreen />);

      changeDocumentNumber('XY987654Z');
      fireEvent.press(screen.getByText('Continue'));

      expect(mockSetMRZForNFC).toHaveBeenCalledWith(
        expect.objectContaining({
          passportNumber: 'XY987654Z',
          dateOfBirth: '900101',
          dateOfExpiry: '301231',
        }),
      );
    });

    it('does not call setMRZForNFC when document number unchanged', () => {
      render(<DataConfirmationScreen />);

      changeDocumentNumber('AB123456C');
      fireEvent.press(screen.getByText('Continue'));

      expect(mockSetMRZForNFC).not.toHaveBeenCalled();
    });

    it('tracks confirmation with had_changes true', () => {
      render(<DataConfirmationScreen />);

      changeDocumentNumber('XY987654Z');
      fireEvent.press(screen.getByText('Continue'));

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        'Passport: Data Confirmation Completed',
        { had_changes: true },
      );
    });
  });
});
