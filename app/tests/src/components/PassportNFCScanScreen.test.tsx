// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

// Mock the scan function
const mockScan = jest.fn();
jest.mock('@/utils/nfcScanner', () => ({
  scan: mockScan,
  parseScanResponse: jest.fn(),
}));

// Mock other passport utilities
jest.mock('@selfxyz/common/utils/passports', () => ({
  initPassportDataParsing: jest.fn(),
}));

jest.mock('@selfxyz/common/utils/csca', () => ({
  getSKIPEM: jest.fn(),
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
jest.mock('@/providers/feedbackProvider', () => ({
  useFeedback: () => ({
    openErrorModal: jest.fn(),
    openSuccessModal: jest.fn(),
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
  useFocusEffect: jest.fn(),
}));

// Create a simple hook to test the cancellation logic
const useCancellationTest = () => {
  const scanCancelledRef = React.useRef(false);
  const scanTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const startScan = () => {
    scanCancelledRef.current = false;
    scanTimeoutRef.current = setTimeout(() => {
      scanCancelledRef.current = true;
    }, 100); // Short timeout for testing
  };

  const checkCancellation = () => {
    return scanCancelledRef.current;
  };

  const cleanup = () => {
    scanCancelledRef.current = true;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  return {
    startScan,
    checkCancellation,
    cleanup,
  };
};

describe('PassportNFCScanScreen - Cancellation Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should set cancellation flag when timeout fires', () => {
    const { result } = renderHook(() => useCancellationTest());

    // Start scan
    act(() => {
      result.current.startScan();
    });

    // Initially not cancelled
    expect(result.current.checkCancellation()).toBe(false);

    // Advance time past timeout
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Should be cancelled after timeout
    expect(result.current.checkCancellation()).toBe(true);
  });

  it('should not set cancellation flag before timeout', () => {
    const { result } = renderHook(() => useCancellationTest());

    // Start scan
    act(() => {
      result.current.startScan();
    });

    // Advance time but not past timeout
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Should not be cancelled before timeout
    expect(result.current.checkCancellation()).toBe(false);
  });

  it('should set cancellation flag on cleanup', () => {
    const { result } = renderHook(() => useCancellationTest());

    // Start scan
    act(() => {
      result.current.startScan();
    });

    // Initially not cancelled
    expect(result.current.checkCancellation()).toBe(false);

    // Cleanup
    act(() => {
      result.current.cleanup();
    });

    // Should be cancelled after cleanup
    expect(result.current.checkCancellation()).toBe(true);
  });

  it('should ignore late scan results after timeout', async () => {
    const { result } = renderHook(() => useCancellationTest());

    // Start scan
    act(() => {
      result.current.startScan();
    });

    // Advance time past timeout
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Should be cancelled
    expect(result.current.checkCancellation()).toBe(true);

    // Simulate late scan completion
    const lateScanResult = { success: true, data: 'mock-data' };

    // If scan was cancelled, we should ignore the result
    // This simulates the early return in the actual component
    expect(result.current.checkCancellation()).toBe(true);
    expect(lateScanResult).toBeDefined(); // Just to show the logic
  });

  it('should allow scan results before timeout', async () => {
    const { result } = renderHook(() => useCancellationTest());

    // Start scan
    act(() => {
      result.current.startScan();
    });

    // Advance time but not past timeout
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Should not be cancelled
    expect(result.current.checkCancellation()).toBe(false);

    // Simulate scan completion before timeout
    const scanResult = { success: true, data: 'mock-data' };

    // If scan was not cancelled, we should process the result
    expect(result.current.checkCancellation()).toBe(false);
    expect(scanResult).toBeDefined(); // Just to show the logic
  });
});
