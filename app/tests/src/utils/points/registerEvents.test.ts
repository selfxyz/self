// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { makeApiRequest } from '@/services/points/api';
import { registerReferralPoints } from '@/services/points/registerEvents';

// Mock the API module
jest.mock('@/services/points/api', () => ({
  makeApiRequest: jest.fn(),
}));

const mockMakeApiRequest = makeApiRequest as jest.MockedFunction<
  typeof makeApiRequest
>;

describe('registerReferralPoints', () => {
  const validReferee = '0x1234567890123456789012345678901234567890';
  const validReferrer = '0x9876543210987654321098765432109876543210';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Self-referral validation', () => {
    it('should reject when referee and referrer are exactly the same', async () => {
      const sameAddress = '0x1234567890123456789012345678901234567890';

      const result = await registerReferralPoints({
        referee: sameAddress,
        referrer: sameAddress,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockMakeApiRequest).not.toHaveBeenCalled();
    });

    it('should reject when referee and referrer differ only in case', async () => {
      const result = await registerReferralPoints({
        referee: '0xAbCdEf1234567890aBcDeF1234567890AbCdEf12',
        referrer: '0xabcdef1234567890abcdef1234567890abcdef12',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockMakeApiRequest).not.toHaveBeenCalled();
    });

    it('should reject when addresses have different casing patterns', async () => {
      const result = await registerReferralPoints({
        referee: '0xAABBCCDDEEFF00112233445566778899AABBCCDD',
        referrer: '0xaabbccddeeff00112233445566778899aabbccdd',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockMakeApiRequest).not.toHaveBeenCalled();
    });

    it('should reject when addresses have whitespace and are the same', async () => {
      const result = await registerReferralPoints({
        referee: '  0x1234567890123456789012345678901234567890  ',
        referrer: '0x1234567890123456789012345678901234567890',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('You cannot refer yourself');
      expect(mockMakeApiRequest).not.toHaveBeenCalled();
    });

    it('should allow referral when addresses are different', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: true,
        status: 200,
        data: { job_id: 'job-123' },
      });

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.jobId).toBe('job-123');
      expect(mockMakeApiRequest).toHaveBeenCalledWith('/referrals/refer', {
        referee: validReferee.toLowerCase(),
        referrer: validReferrer.toLowerCase(),
      });
    });
  });

  describe('Successful API responses', () => {
    it('should handle successful registration with job_id', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: true,
        status: 200,
        data: { job_id: 'job-456' },
      });

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result).toEqual({
        success: true,
        status: 200,
        jobId: 'job-456',
      });
    });

    it('should handle successful registration with 202 status', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: true,
        status: 202,
        data: { job_id: 'job-789' },
      });

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result).toEqual({
        success: true,
        status: 202,
        jobId: 'job-789',
      });
    });
  });

  describe('API error responses', () => {
    it('should handle API error with custom error message', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: false,
        status: 400,
        error: 'Referrer already registered',
      });

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result).toEqual({
        success: false,
        status: 400,
        error: 'Referrer already registered',
      });
    });

    it('should handle API error without custom error message', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: false,
        status: 500,
      });

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result).toEqual({
        success: false,
        status: 500,
        error: 'Failed to register referral relationship. Please try again.',
      });
    });

    it('should handle missing job_id in response', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: true,
        status: 200,
        data: {},
      });

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'Failed to register referral relationship. Please try again.',
      );
    });
  });

  describe('Network errors', () => {
    it('should handle network errors gracefully', async () => {
      mockMakeApiRequest.mockRejectedValue(new Error('Network timeout'));

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result).toEqual({
        success: false,
        status: 500,
        error: 'Network error. Please check your connection and try again.',
      });
    });

    it('should handle unexpected errors', async () => {
      mockMakeApiRequest.mockRejectedValue('Unexpected error string');

      const result = await registerReferralPoints({
        referee: validReferee,
        referrer: validReferrer,
      });

      expect(result).toEqual({
        success: false,
        status: 500,
        error: 'Network error. Please check your connection and try again.',
      });
    });
  });

  describe('Address normalization', () => {
    it('should send lowercase addresses to API', async () => {
      mockMakeApiRequest.mockResolvedValue({
        success: true,
        status: 200,
        data: { job_id: 'job-123' },
      });

      const mixedCaseReferee = '0xAbCdEf1234567890aBcDeF1234567890AbCdEf12';
      const mixedCaseReferrer = '0xAbCdEf0987654321aBcDeF0987654321AbCdEf09';

      await registerReferralPoints({
        referee: mixedCaseReferee,
        referrer: mixedCaseReferrer,
      });

      expect(mockMakeApiRequest).toHaveBeenCalledWith('/referrals/refer', {
        referee: mixedCaseReferee.toLowerCase(),
        referrer: mixedCaseReferrer.toLowerCase(),
      });
    });
  });
});
