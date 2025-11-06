// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import { act, renderHook } from '@testing-library/react-native';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import { getPointsAddress, registerReferralPoints } from '@/utils/points';

jest.mock('@/utils/points', () => ({
  getPointsAddress: jest.fn(),
  registerReferralPoints: jest.fn(),
}));

jest.mock('ethers', () => ({
  ethers: {
    isAddress: jest.fn(),
  },
}));

const mockIsAddress = ethers.isAddress as jest.MockedFunction<
  typeof ethers.isAddress
>;

const mockGetPointsAddress = getPointsAddress as jest.MockedFunction<
  typeof getPointsAddress
>;
const mockRegisterReferralPoints =
  registerReferralPoints as jest.MockedFunction<typeof registerReferralPoints>;

describe('useRegisterReferral', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to valid address validation
    mockIsAddress.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useRegisterReferral());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.registerReferral).toBe('function');
    });
  });

  describe('successful registration', () => {
    it('should successfully register referral with correct addresses', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(mockReferrer);
      });

      expect(mockGetPointsAddress).toHaveBeenCalledTimes(1);
      expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
        referee: mockReferee,
        referrer: mockReferrer,
      });
      expect(registrationResult).toEqual({ success: true });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should reset error state on successful registration', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints
        .mockResolvedValueOnce({
          success: false,
          status: 400,
          error: 'Previous error',
        })
        .mockResolvedValueOnce({
          success: true,
          status: 200,
        });

      const { result } = renderHook(() => useRegisterReferral());

      // First call fails
      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBe('Previous error');

      // Second call succeeds
      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state management', () => {
    it('should set loading to false after successful registration', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to false even when registration fails', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 400,
        error: 'Registration failed',
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle API error response', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';
      const errorMessage = 'Referral already exists';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 409,
        error: errorMessage,
      });

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(mockReferrer);
      });

      expect(registrationResult).toEqual({
        success: false,
        error: errorMessage,
      });
      expect(result.current.error).toBe(errorMessage);
    });

    it('should use default error message when error is not provided', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 500,
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBe('Failed to register referral');
    });

    it('should handle network errors', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';
      const networkError = new Error('Network request failed');

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockRejectedValue(networkError);

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(mockReferrer);
      });

      expect(registrationResult).toEqual({
        success: false,
        error: 'Network request failed',
      });
      expect(result.current.error).toBe('Network request failed');
    });

    it('should handle non-Error exceptions', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockRejectedValue('String error');

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(mockReferrer);
      });

      expect(registrationResult).toEqual({
        success: false,
        error: 'An unexpected error occurred',
      });
      expect(result.current.error).toBe('An unexpected error occurred');
    });

    it('should handle error when getting points address fails', async () => {
      const mockReferrer = '0xReferrerAddress';
      const addressError = new Error('Failed to get points address');

      mockGetPointsAddress.mockRejectedValue(addressError);

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(mockReferrer);
      });

      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
      expect(registrationResult).toEqual({
        success: false,
        error: 'Failed to get points address',
      });
      expect(result.current.error).toBe('Failed to get points address');
    });
  });

  describe('address handling', () => {
    it('should fetch referee address automatically', async () => {
      const mockReferee = '0xAutoFetchedAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(mockGetPointsAddress).toHaveBeenCalledTimes(1);
      expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
        referee: mockReferee,
        referrer: mockReferrer,
      });
    });

    it('should use different referee addresses for multiple calls', async () => {
      const mockReferee1 = '0xRefereeAddress1';
      const mockReferee2 = '0xRefereeAddress2';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress
        .mockResolvedValueOnce(mockReferee1)
        .mockResolvedValueOnce(mockReferee2);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(mockRegisterReferralPoints).toHaveBeenNthCalledWith(1, {
        referee: mockReferee1,
        referrer: mockReferrer,
      });

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(mockRegisterReferralPoints).toHaveBeenNthCalledWith(2, {
        referee: mockReferee2,
        referrer: mockReferrer,
      });
    });
  });

  describe('multiple registrations', () => {
    it('should handle multiple sequential registrations', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer1 = '0xReferrerAddress1';
      const mockReferrer2 = '0xReferrerAddress2';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer1);
      });

      await act(async () => {
        await result.current.registerReferral(mockReferrer2);
      });

      expect(mockRegisterReferralPoints).toHaveBeenCalledTimes(2);
      expect(mockRegisterReferralPoints).toHaveBeenNthCalledWith(1, {
        referee: mockReferee,
        referrer: mockReferrer1,
      });
      expect(mockRegisterReferralPoints).toHaveBeenNthCalledWith(2, {
        referee: mockReferee,
        referrer: mockReferrer2,
      });
    });

    it('should reset error state between registrations', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints
        .mockResolvedValueOnce({
          success: false,
          status: 400,
          error: 'First error',
        })
        .mockResolvedValueOnce({
          success: true,
          status: 200,
        });

      const { result } = renderHook(() => useRegisterReferral());

      // First registration fails
      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBe('First error');

      // Second registration succeeds and clears error
      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('address validation', () => {
    it('should reject invalid hex addresses', async () => {
      const invalidReferrer = 'not-an-address';
      mockIsAddress.mockReturnValue(false);

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(invalidReferrer);
      });

      expect(mockIsAddress).toHaveBeenCalledWith(invalidReferrer);
      expect(mockGetPointsAddress).not.toHaveBeenCalled();
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
      expect(registrationResult).toEqual({
        success: false,
        error: 'Invalid referrer address. Must be a valid hex address.',
      });
      expect(result.current.error).toBe(
        'Invalid referrer address. Must be a valid hex address.',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('should reject empty string addresses', async () => {
      const emptyReferrer = '';
      mockIsAddress.mockReturnValue(false);

      const { result } = renderHook(() => useRegisterReferral());

      let registrationResult: { success: boolean; error?: string } | undefined;

      await act(async () => {
        registrationResult =
          await result.current.registerReferral(emptyReferrer);
      });

      expect(mockIsAddress).toHaveBeenCalledWith(emptyReferrer);
      expect(mockGetPointsAddress).not.toHaveBeenCalled();
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
      expect(registrationResult).toEqual({
        success: false,
        error: 'Invalid referrer address. Must be a valid hex address.',
      });
      expect(result.current.error).toBe(
        'Invalid referrer address. Must be a valid hex address.',
      );
    });

    it('should reject addresses without 0x prefix', async () => {
      const invalidReferrer = '1234567890123456789012345678901234567890';
      mockIsAddress.mockReturnValue(false);

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(invalidReferrer);
      });

      expect(mockIsAddress).toHaveBeenCalledWith(invalidReferrer);
      expect(mockGetPointsAddress).not.toHaveBeenCalled();
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
      expect(result.current.error).toBe(
        'Invalid referrer address. Must be a valid hex address.',
      );
    });

    it('should accept valid hex addresses', async () => {
      const validReferrer = '0x1234567890123456789012345678901234567890';
      const mockReferee = '0xRefereeAddress';

      mockIsAddress.mockReturnValue(true);
      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(validReferrer);
      });

      expect(mockIsAddress).toHaveBeenCalledWith(validReferrer);
      expect(mockGetPointsAddress).toHaveBeenCalled();
      expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
        referee: mockReferee,
        referrer: validReferrer,
      });
      expect(result.current.error).toBeNull();
    });

    it('should accept valid checksummed addresses', async () => {
      const validChecksummedReferrer =
        '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
      const mockReferee = '0xRefereeAddress';

      mockIsAddress.mockReturnValue(true);
      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(validChecksummedReferrer);
      });

      expect(mockIsAddress).toHaveBeenCalledWith(validChecksummedReferrer);
      expect(mockGetPointsAddress).toHaveBeenCalled();
      expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
        referee: mockReferee,
        referrer: validChecksummedReferrer,
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle 400 Bad Request status', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 400,
        error: 'Error 400',
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBe('Error 400');
    });

    it('should handle 409 Conflict status', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 409,
        error: 'Error 409',
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBe('Error 409');
    });

    it('should handle 500 Internal Server Error status', async () => {
      const mockReferee = '0xRefereeAddress';
      const mockReferrer = '0xReferrerAddress';

      mockGetPointsAddress.mockResolvedValue(mockReferee);
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 500,
        error: 'Error 500',
      });

      const { result } = renderHook(() => useRegisterReferral());

      await act(async () => {
        await result.current.registerReferral(mockReferrer);
      });

      expect(result.current.error).toBe('Error 500');
    });
  });
});
