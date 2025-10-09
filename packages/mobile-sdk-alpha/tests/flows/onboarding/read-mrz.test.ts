// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import { Platform } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PassportEvents } from '../../../src/constants/analytics';
import { useReadMRZ } from '../../../src/flows/onboarding/read-mrz';
import { SdkEvents } from '../../../src/types/events';
import type { MRZInfo } from '../../../src/types/public';

import { renderHook } from '@testing-library/react';

// React Native is already mocked in setup.ts

// Mock the MRZ processing functions
vi.mock('../../../src/processing/mrz', () => ({
  checkScannedInfo: vi.fn(() => true),
  formatDateToYYMMDD: vi.fn((date: string) => {
    // Simple mock implementation for testing
    if (date === '1974-08-12') return '740812';
    if (date === '2012-04-15') return '120415';
    return date;
  }),
}));

// Mock the context
vi.mock('../../../src/context', () => ({
  useSelfClient: vi.fn(),
}));

describe('useReadMRZ', () => {
  let mockSelfClient: any;
  let mockMRZState: any;
  let scanStartTimeRef: { current: number };
  let mockUseSelfClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock scan start time
    scanStartTimeRef = { current: Date.now() - 2500 }; // 2.5 seconds ago

    // Mock MRZ state
    mockMRZState = {
      setMRZForNFC: vi.fn(),
    };

    // Mock self client
    mockSelfClient = {
      trackEvent: vi.fn(),
      emit: vi.fn(),
      getMRZState: vi.fn(() => mockMRZState),
    };

    // Mock the useSelfClient hook
    const { useSelfClient } = await import('../../../src/context');
    mockUseSelfClient = vi.mocked(useSelfClient);
    mockUseSelfClient.mockReturnValue(mockSelfClient);
  });

  it('handles successful MRZ read with valid data on iOS', () => {
    // Mock Platform.OS to be 'ios'
    vi.mocked(Platform).OS = 'ios';

    const { result } = renderHook(() => useReadMRZ(scanStartTimeRef));
    const { onPassportRead } = result.current;

    const mockMRZInfo: MRZInfo = {
      documentNumber: 'L898902C3',
      dateOfBirth: '1974-08-12',
      dateOfExpiry: '2012-04-15',
      documentType: 'P',
      issuingCountry: 'UTO',
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };

    // Call the callback with valid data
    onPassportRead(null, mockMRZInfo);

    // Verify MRZ state was set correctly
    expect(mockMRZState.setMRZForNFC).toHaveBeenCalledWith({
      passportNumber: 'L898902C3',
      dateOfBirth: '740812', // Formatted for iOS
      dateOfExpiry: '120415', // Formatted for iOS
      documentType: 'P',
      countryCode: 'UTO',
    });

    // Verify success analytics event was tracked
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(PassportEvents.CAMERA_SCAN_SUCCESS, {
      duration_seconds: expect.any(Number),
    });

    // Verify success event was emitted
    expect(mockSelfClient.emit).toHaveBeenCalledWith(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS);
  });

  it('handles successful MRZ read with valid data on Android', () => {
    // Mock Platform.OS to be 'android'
    vi.mocked(Platform).OS = 'android';

    const { result } = renderHook(() => useReadMRZ(scanStartTimeRef));
    const { onPassportRead } = result.current;

    const mockMRZInfo: MRZInfo = {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812', // Already in YYMMDD format
      dateOfExpiry: '120415', // Already in YYMMDD format
      documentType: 'P',
      issuingCountry: 'UTO',
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };

    // Call the callback with valid data
    onPassportRead(null, mockMRZInfo);

    // Verify MRZ state was set correctly (dates not formatted on Android)
    expect(mockMRZState.setMRZForNFC).toHaveBeenCalledWith({
      passportNumber: 'L898902C3',
      dateOfBirth: '740812', // Not formatted on Android
      dateOfExpiry: '120415', // Not formatted on Android
      documentType: 'P',
      countryCode: 'UTO',
    });

    // Verify success analytics event was tracked
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(PassportEvents.CAMERA_SCAN_SUCCESS, {
      duration_seconds: expect.any(Number),
    });

    // Verify success event was emitted
    expect(mockSelfClient.emit).toHaveBeenCalledWith(SdkEvents.DOCUMENT_MRZ_READ_SUCCESS);
  });

  it('trims whitespace from document type and country code', () => {
    const { result } = renderHook(() => useReadMRZ(scanStartTimeRef));
    const { onPassportRead } = result.current;

    const mockMRZInfo: MRZInfo = {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      documentType: ' P ', // With whitespace
      issuingCountry: ' uto ', // With whitespace and lowercase
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };

    // Call the callback with valid data
    onPassportRead(null, mockMRZInfo);

    // Verify MRZ state was set with trimmed and uppercased values
    expect(mockMRZState.setMRZForNFC).toHaveBeenCalledWith({
      passportNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      documentType: 'P', // Trimmed
      countryCode: 'UTO', // Trimmed and uppercased
    });
  });

  it('handles empty document type and country code gracefully', () => {
    const { result } = renderHook(() => useReadMRZ(scanStartTimeRef));
    const { onPassportRead } = result.current;

    const mockMRZInfo: MRZInfo = {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      documentType: '', // Empty
      issuingCountry: '', // Empty
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };

    // Call the callback with valid data
    onPassportRead(null, mockMRZInfo);

    // Verify MRZ state was set with empty strings
    expect(mockMRZState.setMRZForNFC).toHaveBeenCalledWith({
      passportNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      documentType: '', // Empty string
      countryCode: '', // Empty string
    });
  });

  it('calculates scan duration correctly', () => {
    const { result } = renderHook(() => useReadMRZ(scanStartTimeRef));
    const { onPassportRead } = result.current;

    const mockMRZInfo: MRZInfo = {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
      documentType: 'P',
      issuingCountry: 'UTO',
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };

    // Call the callback with valid data
    onPassportRead(null, mockMRZInfo);

    // Verify the duration was calculated and passed to analytics
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(PassportEvents.CAMERA_SCAN_SUCCESS, {
      duration_seconds: expect.any(Number),
    });

    // The duration should be approximately 2.5 seconds (2500ms / 1000)
    const trackEventCall = mockSelfClient.trackEvent.mock.calls[0];
    const durationSeconds = trackEventCall[1].duration_seconds;
    expect(durationSeconds).toBeCloseTo(2.5, 1);
  });
});
