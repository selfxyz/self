// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import { getPointsAddress, registerReferralPoints } from '@/utils/points';

jest.mock('@/utils/points', () => ({
  getPointsAddress: jest.fn(),
  registerReferralPoints: jest.fn(),
}));

const mockGetPointsAddress = getPointsAddress as jest.MockedFunction<
  typeof getPointsAddress
>;
const mockRegisterReferralPoints =
  registerReferralPoints as jest.MockedFunction<typeof registerReferralPoints>;

describe('useRegisterReferral', () => {
  const validReferrer = '0x1234567890123456789012345678901234567890';
  const mockReferee = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPointsAddress.mockResolvedValue(mockReferee);
  });

  it('should initialize with loading false and no error', () => {
    const { result } = renderHook(() => useRegisterReferral());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should validate referrer address format', async () => {
    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral('invalid-address');
      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid referrer address');
    });

    expect(result.current.error).toContain('Invalid referrer address');
    expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
  });

  it('should register referral successfully', async () => {
    mockRegisterReferralPoints.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(true);
    });

    expect(mockGetPointsAddress).toHaveBeenCalled();
    expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
      referee: mockReferee,
      referrer: validReferrer,
    });
    expect(result.current.error).toBe(null);
  });

  it('should handle registration failure', async () => {
    const errorMessage = 'Registration failed';
    mockRegisterReferralPoints.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle registration failure without error message', async () => {
    mockRegisterReferralPoints.mockResolvedValue({
      success: false,
    });

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to register referral');
    });

    expect(result.current.error).toBe('Failed to register referral');
  });

  it('should handle exceptions during registration', async () => {
    const errorMessage = 'Network error';
    mockRegisterReferralPoints.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle non-Error exceptions', async () => {
    mockRegisterReferralPoints.mockRejectedValue('String error');

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(false);
      expect(response.error).toBe('An unexpected error occurred');
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('should set loading state during registration', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockRegisterReferralPoints.mockReturnValue(promise as any);

    const { result } = renderHook(() => useRegisterReferral());

    act(() => {
      result.current.registerReferral(validReferrer);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ success: true });
      await promise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear error on new registration attempt', async () => {
    mockRegisterReferralPoints
      .mockResolvedValueOnce({ success: false, error: 'First error' })
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useRegisterReferral());

    // First attempt fails
    await act(async () => {
      await result.current.registerReferral(validReferrer);
    });

    expect(result.current.error).toBe('First error');

    // Second attempt succeeds
    await act(async () => {
      await result.current.registerReferral(validReferrer);
    });

    expect(result.current.error).toBe(null);
  });
});
