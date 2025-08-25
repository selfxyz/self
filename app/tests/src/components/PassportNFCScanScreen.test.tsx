// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import PassportNFCScanScreen from '@/screens/passport/PassportNFCScanScreen';

// Mock the scan function - this is the key to testing timing
const mockScan = jest.fn();
jest.mock('@/utils/nfcScanner', () => ({
  scan: mockScan,
  parseScanResponse: jest.fn(() => ({ documentNumber: '123456789' })),
}));

// Mock other passport utilities
jest.mock('@selfxyz/common/utils/passports', () => ({
  initPassportDataParsing: jest.fn(),
}));

jest.mock('@selfxyz/common/utils/csca', () => ({
  getSKIPEM: jest.fn(() => 'mock-ski-pem'),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  storePassportData: jest.fn(),
}));

// Mock other dependencies
jest.mock('@/utils/email', () => ({
  sendFeedbackEmail: jest.fn(),
}));

jest.mock('@/utils/proving/validateDocument', () => ({
  hasAnyValidRegisteredDocument: jest.fn(() => Promise.resolve(false)),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  hideFeedbackButton: jest.fn(),
}));

// Mock feedback provider
const mockOpenErrorModal = jest.fn();
const mockOpenSuccessModal = jest.fn();
jest.mock('@/providers/feedbackProvider', () => ({
  useFeedback: () => ({
    openErrorModal: mockOpenErrorModal,
    openSuccessModal: mockOpenSuccessModal,
  }),
}));

// Mock haptic navigation
jest.mock('@/hooks/useHapticNavigation', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/utils/analytics', () => ({
  __esModule: true,
  default: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock navigation hooks
const mockNavigate = jest.fn();
const mockRoute = {
  params: {},
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockRoute,
  useFocusEffect: jest.fn(callback => {
    // Execute the callback immediately for testing
    const cleanup = callback();
    return cleanup;
  }),
}));

// Mock NFC Manager
jest.mock('react-native-nfc-manager', () => ({
  isSupported: jest.fn(() => Promise.resolve(true)),
  isEnabled: jest.fn(() => Promise.resolve(true)),
}));

// Mock react-native completely to avoid TurboModule issues
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  return Object.setPrototypeOf(
    {
      Platform: {
        OS: 'ios',
        select: (config: any) => config.ios,
      },
      // Mock components we need
      TouchableOpacity: RN.TouchableOpacity || 'TouchableOpacity',
      Text: RN.Text || 'Text',
      View: RN.View || 'View',
      Image: RN.Image || 'Image',
      // Mock Settings that's causing the TurboModule error
      Settings: {
        get: jest.fn(),
        set: jest.fn(),
        watchKeys: jest.fn(),
        clearWatch: jest.fn(),
      },
    },
    RN,
  );
});

// Mock Tamagui components to avoid theme issues
jest.mock('tamagui', () => ({
  Button: ({ onPress, children, ...props }: any) => {
    const MockButton = require('react-native').TouchableOpacity;
    const MockText = require('react-native').Text;
    return (
      <MockButton onPress={onPress} testID={props.testID} {...props}>
        <MockText>{children}</MockText>
      </MockButton>
    );
  },
  XStack: ({ children, ...props }: any) => {
    const MockView = require('react-native').View;
    return <MockView {...props}>{children}</MockView>;
  },
  Image: ({ ...props }: any) => {
    const MockImage = require('react-native').Image;
    return <MockImage {...props} />;
  },
  Text: ({ children, ...props }: any) => {
    const MockText = require('react-native').Text;
    return <MockText {...props}>{children}</MockText>;
  },
  styled: (component: any, styles?: any) => {
    // Return a mock component that accepts the same props
    return ({ children, ...props }: any) => {
      const mockReact = require('react');
      if (typeof component === 'string') {
        const MockView = require('react-native').View;
        return <MockView {...props}>{children}</MockView>;
      }
      return mockReact.createElement(component, props, children);
    };
  },
}));

describe('PassportNFCScanScreen - Cancellation Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show timeout error when 30-second timeout fires', async () => {
    // Mock a scan that never resolves (simulates a stuck scan)
    mockScan.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { getByText } = render(<PassportNFCScanScreen />);

    // Start the scan
    const verifyButton = getByText('Verify your ID');
    act(() => {
      fireEvent.press(verifyButton);
    });

    // Fast forward to just before timeout
    act(() => {
      jest.advanceTimersByTime(29000);
    });

    // Should not have timed out yet
    expect(mockOpenErrorModal).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalledWith('NFC_SCAN_FAILED', {
      error: 'timeout',
    });

    // Fast forward past the 30-second timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should now have timed out
    expect(mockTrackEvent).toHaveBeenCalledWith('NFC_SCAN_FAILED', {
      error: 'timeout',
    });
    expect(mockOpenErrorModal).toHaveBeenCalledWith(
      'Scan timed out. Please try again.',
    );
  });

  it('should ignore scan results that complete after timeout', async () => {
    // Mock a scan that resolves after 35 seconds (5 seconds after timeout)
    let resolveScan: (value: any) => void;
    mockScan.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveScan = resolve;
        }),
    );

    const { getByText } = render(<PassportNFCScanScreen />);

    // Start the scan
    const verifyButton = getByText('Verify your ID');
    act(() => {
      fireEvent.press(verifyButton);
    });

    // Fast forward past the 30-second timeout
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify timeout was triggered
    expect(mockTrackEvent).toHaveBeenCalledWith('NFC_SCAN_FAILED', {
      error: 'timeout',
    });
    expect(mockOpenErrorModal).toHaveBeenCalledWith(
      'Scan timed out. Please try again.',
    );

    // Clear previous calls to track what happens next
    mockTrackEvent.mockClear();
    mockNavigate.mockClear();

    // Now resolve the scan (simulating late completion)
    act(() => {
      resolveScan({ success: true, data: 'mock-passport-data' });
    });

    // Wait for any promises to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // The cancellation guard should prevent any success analytics or navigation
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'NFC_SCAN_SUCCESS',
      expect.any(Object),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('ConfirmBelongingScreen', {});
  });

  it('should ignore scan errors that occur after timeout', async () => {
    // Mock a scan that rejects after 35 seconds (5 seconds after timeout)
    let rejectScan: (error: any) => void;
    mockScan.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectScan = reject;
        }),
    );

    const { getByText } = render(<PassportNFCScanScreen />);

    // Start the scan
    const verifyButton = getByText('Verify your ID');
    act(() => {
      fireEvent.press(verifyButton);
    });

    // Fast forward past the 30-second timeout
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify timeout was triggered
    expect(mockTrackEvent).toHaveBeenCalledWith('NFC_SCAN_FAILED', {
      error: 'timeout',
    });

    // Clear previous calls to track what happens next
    mockTrackEvent.mockClear();
    mockOpenErrorModal.mockClear();

    // Now reject the scan (simulating late error)
    act(() => {
      rejectScan(new Error('Late scan error'));
    });

    // Wait for any promises to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // The cancellation guard should prevent any additional error analytics
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'NFC_SCAN_FAILED',
      expect.objectContaining({ error: 'Late scan error' }),
    );
    expect(mockOpenErrorModal).not.toHaveBeenCalledWith('Late scan error');
  });

  it('should allow successful scan completion before timeout', async () => {
    // Mock a fast scan that completes in 10 seconds
    mockScan.mockResolvedValue({ success: true, data: 'mock-passport-data' });

    const { getByText } = render(<PassportNFCScanScreen />);

    // Start the scan
    const verifyButton = getByText('Verify your ID');
    act(() => {
      fireEvent.press(verifyButton);
    });

    // Fast forward to 10 seconds (well before timeout)
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Wait for the scan to complete
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'NFC_SCAN_SUCCESS',
        expect.objectContaining({ duration_seconds: expect.any(String) }),
      );
    });

    // Should eventually navigate to next screen
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ConfirmBelongingScreen', {});
    });

    // Should not have triggered timeout
    expect(mockTrackEvent).not.toHaveBeenCalledWith('NFC_SCAN_FAILED', {
      error: 'timeout',
    });
  });

  it('should reset cancellation flag when starting a new scan', async () => {
    // Mock a scan that never resolves
    mockScan.mockImplementation(() => new Promise(() => {}));

    const { getByText } = render(<PassportNFCScanScreen />);

    // Start first scan
    const verifyButton = getByText('Verify your ID');
    act(() => {
      fireEvent.press(verifyButton);
    });

    // Let it timeout
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Verify timeout
    expect(mockTrackEvent).toHaveBeenCalledWith('NFC_SCAN_FAILED', {
      error: 'timeout',
    });

    // Clear mocks
    mockTrackEvent.mockClear();
    mockOpenErrorModal.mockClear();

    // Mock a successful scan for the retry
    mockScan.mockResolvedValue({ success: true, data: 'mock-passport-data' });

    // Start second scan (retry)
    act(() => {
      fireEvent.press(verifyButton);
    });

    // The cancellation flag should be reset, allowing the new scan to proceed
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'NFC_SCAN_SUCCESS',
        expect.objectContaining({ duration_seconds: expect.any(String) }),
      );
    });
  });
});
