// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import { recordReferralPointEvent } from '@/services/points';

jest.mock('@/services/points', () => ({
  recordReferralPointEvent: jest.fn(),
}));

const mockRecordReferralPointEvent =
  recordReferralPointEvent as jest.MockedFunction<
    typeof recordReferralPointEvent
  >;

describe('useRegisterReferral', () => {
  const validReferrer = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockRecordReferralPointEvent).not.toHaveBeenCalled();
  });

  it('should register referral successfully', async () => {
    mockRecordReferralPointEvent.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(true);
    });

    expect(mockRecordReferralPointEvent).toHaveBeenCalledWith(validReferrer);
    expect(result.current.error).toBe(null);
  });

  it('should handle registration failure', async () => {
    const errorMessage = 'Registration failed';
    mockRecordReferralPointEvent.mockResolvedValue({
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
    mockRecordReferralPointEvent.mockResolvedValue({
      success: false,
      error: undefined,
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
    mockRecordReferralPointEvent.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      const response = await result.current.registerReferral(validReferrer);
      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle non-Error exceptions', async () => {
    mockRecordReferralPointEvent.mockRejectedValue('String error');

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
    mockRecordReferralPointEvent.mockReturnValue(promise as any);

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
    mockRecordReferralPointEvent
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
