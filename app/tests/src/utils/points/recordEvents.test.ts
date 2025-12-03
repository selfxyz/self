// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { recordReferralPointEvent } from '@/services/points/recordEvents';
import { registerReferralPoints } from '@/services/points/registerEvents';
import { getPointsAddress } from '@/services/points/utils';

// Mock dependencies
jest.mock('@/services/points/registerEvents', () => ({
  registerReferralPoints: jest.fn(),
}));

jest.mock('@/services/points/utils', () => ({
  getPointsAddress: jest.fn(),
}));

// Mock the store before the import
const mockAddEvent = jest.fn();
const mockMarkEventAsProcessed = jest.fn();
const mockMarkEventAsFailed = jest.fn();

jest.mock('@/stores/pointEventStore', () => ({
  usePointEventStore: {
    getState: jest.fn(() => ({
      addEvent: mockAddEvent,
      markEventAsProcessed: mockMarkEventAsProcessed,
      markEventAsFailed: mockMarkEventAsFailed,
    })),
  },
}));

jest.mock('@/services/points/eventPolling', () => ({
  pollEventProcessingStatus: jest.fn(() => Promise.resolve('completed')),
}));

jest.mock('@/services/points/api', () => ({
  isSuccessfulStatus: jest.fn(
    (status: number) => status === 200 || status === 202,
  ),
}));

const mockRegisterReferralPoints =
  registerReferralPoints as jest.MockedFunction<typeof registerReferralPoints>;
const mockGetPointsAddress = getPointsAddress as jest.MockedFunction<
  typeof getPointsAddress
>;

describe('recordReferralPointEvent', () => {
  const currentUserAddress = '0x1234567890123456789012345678901234567890';
  const differentReferrer = '0x9876543210987654321098765432109876543210';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPointsAddress.mockResolvedValue(currentUserAddress);
    // Reset store mocks
    mockAddEvent.mockResolvedValue(undefined);
    mockMarkEventAsProcessed.mockReturnValue(undefined);
    mockMarkEventAsFailed.mockReturnValue(undefined);
  });

  describe('Self-referral validation', () => {
    it('should reject when user tries to refer themselves (exact match)', async () => {
      const result = await recordReferralPointEvent(currentUserAddress);

      expect(result.success).toBe(false);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
    });

    it('should reject when user tries to refer themselves (case insensitive)', async () => {
      const uppercaseVersion = currentUserAddress.toUpperCase();

      const result = await recordReferralPointEvent(uppercaseVersion);

      expect(result.success).toBe(false);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
    });

    it('should reject when addresses differ only in mixed casing', async () => {
      mockGetPointsAddress.mockResolvedValue(
        '0xAbCdEf1234567890aBcDeF1234567890AbCdEf12',
      );

      const result = await recordReferralPointEvent(
        '0xabcdef1234567890abcdef1234567890abcdef12',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
    });

    it('should reject when addresses have whitespace but are the same', async () => {
      // This test verifies the trim() functionality added by the user
      mockGetPointsAddress.mockResolvedValue(
        '  0x1234567890123456789012345678901234567890  ',
      );

      const result = await recordReferralPointEvent(
        '  0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
    });

    it('should allow referral when addresses are different', async () => {
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
        jobId: 'job-123',
      });

      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(true);
      expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
        referee: currentUserAddress,
        referrer: differentReferrer,
      });
    });

    it('should show user-friendly error message', async () => {
      const result = await recordReferralPointEvent(currentUserAddress);

      expect(result.error).toBe(
        'You cannot refer yourself. Please use a different referral link.',
      );
    });
  });

  describe('Successful registration flow', () => {
    beforeEach(() => {
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
        jobId: 'job-456',
      });
    });

    it('should successfully register valid referral', async () => {
      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(true);
      expect(mockRegisterReferralPoints).toHaveBeenCalledWith({
        referee: currentUserAddress,
        referrer: differentReferrer,
      });
    });

    it('should call getPointsAddress to get current user', async () => {
      await recordReferralPointEvent(differentReferrer);

      expect(mockGetPointsAddress).toHaveBeenCalled();
    });
  });

  describe('Registration failures', () => {
    it('should handle registration API errors', async () => {
      const errorMessage = 'Referrer already registered';
      mockRegisterReferralPoints.mockResolvedValue({
        success: false,
        status: 400,
        error: errorMessage,
      });

      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should handle missing job_id in response', async () => {
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 200,
        // Missing jobId
      });

      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid status codes', async () => {
      mockRegisterReferralPoints.mockResolvedValue({
        success: true,
        status: 201, // Not 200 or 202
        jobId: 'job-123',
      });

      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle errors from getPointsAddress', async () => {
      mockGetPointsAddress.mockRejectedValue(
        new Error('Failed to get address'),
      );

      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'An unexpected error occurred. Please try again.',
      );
      expect(mockRegisterReferralPoints).not.toHaveBeenCalled();
    });

    it('should handle network errors during registration', async () => {
      mockRegisterReferralPoints.mockRejectedValue(new Error('Network error'));

      const result = await recordReferralPointEvent(differentReferrer);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'An unexpected error occurred. Please try again.',
      );
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const testError = new Error('Test error');
      mockRegisterReferralPoints.mockRejectedValue(testError);

      await recordReferralPointEvent(differentReferrer);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error recording referral point event:',
        testError,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string referrer', async () => {
      mockGetPointsAddress.mockResolvedValue('');

      const result = await recordReferralPointEvent('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('You cannot refer yourself');
    });

    it('should handle addresses with 0x prefix variations', async () => {
      mockGetPointsAddress.mockResolvedValue(
        '0x1234567890123456789012345678901234567890',
      );

      // Both have 0x prefix, should be detected as same
      const result = await recordReferralPointEvent(
        '0x1234567890123456789012345678901234567890',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('You cannot refer yourself');
    });
  });
});
