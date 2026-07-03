// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as mockReact from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { BiometricEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import DataConfirmationScreen from '@/screens/documents/scanning/DataConfirmationScreen';

const mockView = View;
const mockText = Text;
const mockTouchableOpacity = TouchableOpacity;

const mockSetMRZForNFC = jest.fn();
const mockTrackBranchEvent = jest.fn();

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
  trackBranchEvent: (...args: unknown[]) => mockTrackBranchEvent(...args),
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

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  PrimaryButton: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) =>
    mockReact.createElement(
      mockTouchableOpacity,
      { onPress },
      mockReact.createElement(mockText, null, children),
    ),
  SecondaryButton: ({
    children,
    onPress,
    disabled,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    mockReact.createElement(
      mockTouchableOpacity,
      { onPress, disabled },
      mockReact.createElement(mockText, null, children),
    ),
}));

const mockNavigate = jest.fn();
const mockNavigateToHome = jest.fn();
const mockPopTo = jest.fn();
let mockStackRoutes: Array<{ name: string; params?: unknown }> = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    popTo: mockPopTo,
    getState: () => ({ routes: mockStackRoutes }),
  }),
  useRoute: () => ({
    params: undefined,
  }),
}));

jest.mock('@/hooks/useHapticNavigation', () =>
  jest.fn(() => mockNavigateToHome),
);

jest.mock('@/hooks/useKycLauncher', () => ({
  useKycLauncher: () => ({
    launchKycVerification: jest.fn(),
    showKycFallbackModal: jest.fn(),
    isLoading: false,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

function changeField(testId: string, value: string) {
  const cb = mockInputFieldCallbacks[testId]?.onChangeText;
  if (!cb) throw new Error(`${testId} onChangeText not found`);
  act(() => cb(value));
}

function changeDocumentNumber(value: string) {
  changeField('input-document-number', value);
}

describe('DataConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStackRoutes = [];
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

  describe('NFC-debug detour', () => {
    it('pops back to Troubleshooting when its route is marked pending', () => {
      mockStackRoutes = [
        { name: 'Home' },
        { name: 'Troubleshooting', params: { nfcDebug: 'pending' } },
        { name: 'DocumentCamera' },
        { name: 'DataConfirmation' },
      ];
      render(<DataConfirmationScreen />);

      fireEvent.press(screen.getByText('Continue'));

      expect(mockPopTo).toHaveBeenCalledWith('Troubleshooting', {
        nfcDebug: 'run',
      });
      expect(mockNavigate).not.toHaveBeenCalledWith('DocumentNFCScan');
    });

    it('ignores a Troubleshooting route without the pending mark', () => {
      mockStackRoutes = [
        { name: 'Home' },
        { name: 'Troubleshooting' },
        { name: 'DataConfirmation' },
      ];
      render(<DataConfirmationScreen />);

      fireEvent.press(screen.getByText('Continue'));

      expect(mockPopTo).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('DocumentNFCScan');
    });
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
  });

  describe('analytics', () => {
    it('fires Data Confirmation Confirmed with edited=false and no edited fields when unchanged', () => {
      render(<DataConfirmationScreen />);

      fireEvent.press(screen.getByText('Continue'));

      expect(mockTrackBranchEvent).toHaveBeenCalledWith(
        expect.anything(),
        BiometricEvents.DATA_CONFIRMATION_CONFIRMED,
        { edited: false, edited_fields: [] },
      );
    });

    it('reports the single field that changed', () => {
      render(<DataConfirmationScreen />);

      changeDocumentNumber('XY987654Z');
      fireEvent.press(screen.getByText('Continue'));

      expect(mockTrackBranchEvent).toHaveBeenCalledWith(
        expect.anything(),
        BiometricEvents.DATA_CONFIRMATION_CONFIRMED,
        { edited: true, edited_fields: ['document_number'] },
      );
    });

    it('reports every field that changed', () => {
      render(<DataConfirmationScreen />);

      changeDocumentNumber('XY987654Z');
      changeField('input-date-of-birth', '910202');
      changeField('input-document-expiration-date', '350101');
      fireEvent.press(screen.getByText('Continue'));

      expect(mockTrackBranchEvent).toHaveBeenCalledWith(
        expect.anything(),
        BiometricEvents.DATA_CONFIRMATION_CONFIRMED,
        {
          edited: true,
          edited_fields: [
            'document_number',
            'date_of_birth',
            'document_expiry_date',
          ],
        },
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
  });
});
