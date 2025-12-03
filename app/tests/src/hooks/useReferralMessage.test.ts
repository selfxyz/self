// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useReferralMessage } from '@/hooks/useReferralMessage';
import { getOrGeneratePointsAddress } from '@/providers/authProvider';
import { useSettingStore } from '@/stores/settingStore';

jest.mock('@/providers/authProvider', () => ({
  getOrGeneratePointsAddress: jest.fn(),
}));

const mockGetOrGeneratePointsAddress =
  getOrGeneratePointsAddress as jest.MockedFunction<
    typeof getOrGeneratePointsAddress
  >;

describe('useReferralMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useSettingStore.setState({ pointsAddress: null });
    });
  });

  describe('initial state', () => {
    it('should have loading state when no address is available', () => {
      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.message).toBe('');
      expect(result.current.referralLink).toBe('');
    });
  });

  describe('when address is in store', () => {
    it('should use address from store and generate message immediately', () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      act(() => {
        useSettingStore.setState({ pointsAddress: mockAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.referralLink).toBe(
        `https://referral.self.xyz/referral/${mockAddress}`,
      );
      expect(result.current.message).toBe(
        `Join Self and use my referral link:\n\nhttps://referral.self.xyz/referral/${mockAddress}`,
      );
      expect(mockGetOrGeneratePointsAddress).not.toHaveBeenCalled();
    });

    it('should update when store address changes', () => {
      const firstAddress = '0x1111111111111111111111111111111111111111';
      const secondAddress = '0x2222222222222222222222222222222222222222';

      act(() => {
        useSettingStore.setState({ pointsAddress: firstAddress });
      });

      const { result, rerender } = renderHook(() => useReferralMessage());

      expect(result.current.referralLink).toContain(firstAddress);

      act(() => {
        useSettingStore.setState({ pointsAddress: secondAddress });
      });

      rerender();

      expect(result.current.referralLink).toContain(secondAddress);
      expect(result.current.referralLink).not.toContain(firstAddress);
    });
  });

  describe('when address needs to be fetched', () => {
    it('should fetch address when not in store', async () => {
      const mockAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      mockGetOrGeneratePointsAddress.mockResolvedValue(mockAddress);

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(true);
      expect(mockGetOrGeneratePointsAddress).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.referralLink).toBe(
        `https://referral.self.xyz/referral/${mockAddress}`,
      );
      expect(result.current.message).toBe(
        `Join Self and use my referral link:\n\nhttps://referral.self.xyz/referral/${mockAddress}`,
      );
    });

    it('should not fetch if address is already in store', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockGetOrGeneratePointsAddress.mockResolvedValue('0xOTHER');

      act(() => {
        useSettingStore.setState({ pointsAddress: mockAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(false);
      expect(mockGetOrGeneratePointsAddress).not.toHaveBeenCalled();
      expect(result.current.referralLink).toContain(mockAddress);
    });

    it('should remain in loading state when fetch is delayed', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockGetOrGeneratePointsAddress.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve(mockAddress), 200)),
      );

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(true);
      expect(mockGetOrGeneratePointsAddress).toHaveBeenCalledTimes(1);

      // Check that it's still loading before the promise resolves
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(result.current.isLoading).toBe(true);

      // Wait for the promise to resolve
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.referralLink).toContain(mockAddress);
    });
  });

  describe('referral link generation', () => {
    it('should generate correct referral link format', () => {
      const mockAddress = '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
      act(() => {
        useSettingStore.setState({ pointsAddress: mockAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.referralLink).toBe(
        `https://referral.self.xyz/referral/${mockAddress}`,
      );
    });

    it('should generate correct message format', () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      act(() => {
        useSettingStore.setState({ pointsAddress: mockAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      const expectedLink = `https://referral.self.xyz/referral/${mockAddress}`;
      expect(result.current.message).toBe(
        `Join Self and use my referral link:\n\n${expectedLink}`,
      );
      expect(result.current.message).toContain(
        'Join Self and use my referral link:',
      );
      expect(result.current.message).toContain(expectedLink);
    });

    it('should handle different address formats', () => {
      const addresses = [
        '0x0000000000000000000000000000000000000000',
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      ];

      addresses.forEach(address => {
        act(() => {
          useSettingStore.setState({ pointsAddress: address });
        });

        const { result } = renderHook(() => useReferralMessage());

        expect(result.current.referralLink).toContain(address);
        expect(result.current.message).toContain(address);
      });
    });
  });

  describe('loading state transitions', () => {
    it('should transition from loading to loaded when address is fetched', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      mockGetOrGeneratePointsAddress.mockImplementation(
        () =>
          new Promise(resolve => setTimeout(() => resolve(mockAddress), 100)),
      );

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.referralLink).toBeTruthy();
      expect(result.current.message).toBeTruthy();
    });

    it('should not be loading when address is immediately available from store', () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      act(() => {
        useSettingStore.setState({ pointsAddress: mockAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.referralLink).toBeTruthy();
    });
  });

  describe('store address priority', () => {
    it('should prefer store address over fetched address', async () => {
      const storeAddress = '0xSTORE_ADDRESS';
      const fetchedAddress = '0xFETCHED_ADDRESS';

      mockGetOrGeneratePointsAddress.mockResolvedValue(fetchedAddress);

      act(() => {
        useSettingStore.setState({ pointsAddress: storeAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.referralLink).toContain(storeAddress);
      expect(result.current.referralLink).not.toContain(fetchedAddress);
      expect(mockGetOrGeneratePointsAddress).not.toHaveBeenCalled();
    });

    it('should use fetched address when store address is null', async () => {
      const fetchedAddress = '0xFETCHED_ADDRESS';
      mockGetOrGeneratePointsAddress.mockResolvedValue(fetchedAddress);

      act(() => {
        useSettingStore.setState({ pointsAddress: null });
      });

      const { result } = renderHook(() => useReferralMessage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.referralLink).toContain(fetchedAddress);
      expect(mockGetOrGeneratePointsAddress).toHaveBeenCalled();
    });

    it('should update when store address changes from null to value', async () => {
      const fetchedAddress = '0xFETCHED_ADDRESS';
      const storeAddress = '0xSTORE_ADDRESS';

      mockGetOrGeneratePointsAddress.mockResolvedValue(fetchedAddress);

      act(() => {
        useSettingStore.setState({ pointsAddress: null });
      });

      const { result, rerender } = renderHook(() => useReferralMessage());

      await waitFor(() => {
        expect(result.current.referralLink).toContain(fetchedAddress);
      });

      act(() => {
        useSettingStore.setState({ pointsAddress: storeAddress });
      });

      rerender();

      expect(result.current.referralLink).toContain(storeAddress);
      expect(result.current.referralLink).not.toContain(fetchedAddress);
    });
  });

  describe('memoization', () => {
    it('should memoize result based on address', () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      act(() => {
        useSettingStore.setState({ pointsAddress: mockAddress });
      });

      const { result, rerender } = renderHook(() => useReferralMessage());

      const firstMessage = result.current.message;
      const firstLink = result.current.referralLink;

      rerender();

      expect(result.current.message).toBe(firstMessage);
      expect(result.current.referralLink).toBe(firstLink);
    });

    it('should update memoized values when address changes', () => {
      const firstAddress = '0x1111111111111111111111111111111111111111';
      const secondAddress = '0x2222222222222222222222222222222222222222';

      act(() => {
        useSettingStore.setState({ pointsAddress: firstAddress });
      });

      const { result, rerender } = renderHook(() => useReferralMessage());

      const firstMessage = result.current.message;

      act(() => {
        useSettingStore.setState({ pointsAddress: secondAddress });
      });

      rerender();

      expect(result.current.message).not.toBe(firstMessage);
      expect(result.current.message).toContain(secondAddress);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string address in store', () => {
      act(() => {
        useSettingStore.setState({ pointsAddress: '' });
      });

      renderHook(() => useReferralMessage());

      // Empty string is falsy, so it should trigger fetch
      expect(mockGetOrGeneratePointsAddress).toHaveBeenCalled();
    });

    it('should handle very long addresses', () => {
      const longAddress =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      act(() => {
        useSettingStore.setState({ pointsAddress: longAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.referralLink).toContain(longAddress);
      expect(result.current.message).toContain(longAddress);
    });

    it('should handle address with checksum casing', () => {
      const checksumAddress = '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4';
      act(() => {
        useSettingStore.setState({ pointsAddress: checksumAddress });
      });

      const { result } = renderHook(() => useReferralMessage());

      expect(result.current.referralLink).toContain(checksumAddress);
      expect(result.current.message).toContain(checksumAddress);
    });
  });
});
