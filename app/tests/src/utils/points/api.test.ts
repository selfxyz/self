// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { ethers } from 'ethers';

import {
  unsafe_getPointsPrivateKey,
  unsafe_getPrivateKey,
} from '@/providers/authProvider';
import { isSuccessfulStatus, makeApiRequest } from '@/services/points/api';
import { POINTS_API_BASE_URL } from '@/services/points/constants';
import { getPointsAddress } from '@/services/points/utils';

// Mock dependencies
jest.mock('axios');
jest.mock('@/providers/authProvider', () => ({
  unsafe_getPrivateKey: jest.fn(),
  unsafe_getPointsPrivateKey: jest.fn(),
}));
jest.mock('@/services/points/utils', () => ({
  getPointsAddress: jest.fn(),
}));
jest.mock('ethers', () => ({
  ethers: {
    Wallet: jest.fn(),
    Signature: {
      from: jest.fn(),
    },
    getBytes: jest.fn(),
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockUnsafeGetPrivateKey = unsafe_getPrivateKey as jest.MockedFunction<
  typeof unsafe_getPrivateKey
>;
const mockUnsafeGetPointsPrivateKey =
  unsafe_getPointsPrivateKey as jest.MockedFunction<
    typeof unsafe_getPointsPrivateKey
  >;
const mockGetPointsAddress = getPointsAddress as jest.MockedFunction<
  typeof getPointsAddress
>;

describe('isSuccessfulStatus', () => {
  it('should return true for 200 status code', () => {
    expect(isSuccessfulStatus(200)).toBe(true);
  });

  it('should return true for 202 status code', () => {
    expect(isSuccessfulStatus(202)).toBe(true);
  });

  it('should return false for other 2xx codes', () => {
    expect(isSuccessfulStatus(201)).toBe(false);
    expect(isSuccessfulStatus(204)).toBe(false);
  });

  it('should return false for error status codes', () => {
    expect(isSuccessfulStatus(400)).toBe(false);
    expect(isSuccessfulStatus(404)).toBe(false);
    expect(isSuccessfulStatus(500)).toBe(false);
  });
});

describe('Points API - Signature Logic', () => {
  const mockPrimaryPrivateKey =
    '0x1234567890123456789012345678901234567890123456789012345678901234';
  const mockPointsPrivateKey =
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const mockAddress = '0xAbCdEf1234567890aBcDeF1234567890AbCdEf12';
  const mockSignatureBytes = new Uint8Array([1, 2, 3, 4, 5]);
  const mockSignatureBase64 = 'AQIDBAU='; // base64 of [1,2,3,4,5]

  let mockWallet: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console.error in tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Setup wallet mock
    mockWallet = {
      signMessage: jest.fn(),
      address: mockAddress,
    };

    // Mock ethers.Wallet constructor
    (ethers.Wallet as any).mockImplementation(() => mockWallet);

    // Mock ethers.Signature.from
    (ethers.Signature.from as jest.Mock).mockReturnValue({
      yParity: 1,
    });

    // Mock ethers.getBytes
    (ethers.getBytes as jest.Mock).mockReturnValue(mockSignatureBytes);

    // Mock Buffer.from for base64 conversion
    global.Buffer.from = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue(mockSignatureBase64),
    }) as any;

    // Default: points address does not match any tested address to prefer primary key unless overridden
    mockGetPointsAddress.mockResolvedValue(
      '0x9999999999999999999999999999999999999999',
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Signature Generation', () => {
    it('should use points private key when signing the points address', async () => {
      const pointsAddress = '0x1234567890123456789012345678901234567890';
      const mockSignatureHex =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

      // Mock getPointsAddress to return the address being signed
      mockGetPointsAddress.mockResolvedValue(pointsAddress);
      mockUnsafeGetPointsPrivateKey.mockResolvedValue(mockPointsPrivateKey);
      mockWallet.signMessage.mockResolvedValue(mockSignatureHex);

      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      await makeApiRequest('/referrals/refer', {
        referee: pointsAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      // Verify wallet was created with points private key
      expect(ethers.Wallet).toHaveBeenCalledWith(mockPointsPrivateKey);

      // Verify message signed was lowercase address
      expect(mockWallet.signMessage).toHaveBeenCalledWith(
        pointsAddress.toLowerCase(),
      );

      // Verify signature was parsed
      expect(ethers.Signature.from).toHaveBeenCalledWith(mockSignatureHex);

      // Verify signature bytes were extracted
      expect(ethers.getBytes).toHaveBeenCalledWith(mockSignatureHex);
    });

    it('should fail when signing a non-points address', async () => {
      const userAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const pointsAddress = '0x9999999999999999999999999999999999999999';

      // Mock getPointsAddress to return a different address
      mockGetPointsAddress.mockResolvedValue(pointsAddress);

      const result = await makeApiRequest('/verify-action', {
        action: 'secret_backup',
        address: userAddress,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain(
        'Failed to retrieve private key for signing',
      );
    });

    it('should fail when getPointsAddress fails', async () => {
      mockGetPointsAddress.mockRejectedValue(
        new Error('Address lookup failed'),
      );

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain(
        'Failed to retrieve private key for signing',
      );
    });

    it('should handle error when points key retrieval fails', async () => {
      mockGetPointsAddress.mockResolvedValue(mockAddress);
      mockUnsafeGetPointsPrivateKey.mockRejectedValue(
        new Error('Biometric auth failed'),
      );

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain('Failed to generate signature');
    });

    it('should handle missing points private key', async () => {
      mockGetPointsAddress.mockResolvedValue(mockAddress);
      mockUnsafeGetPointsPrivateKey.mockResolvedValue(null);

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain(
        'Failed to retrieve private key for signing',
      );
    });
  });

  describe('makeApiRequest - Auto-detection of signing address', () => {
    beforeEach(() => {
      mockUnsafeGetPointsPrivateKey.mockResolvedValue(mockPointsPrivateKey);
      mockWallet.signMessage.mockResolvedValue(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      );
    });

    it('should auto-detect referee field and include signature', async () => {
      const refereeAddress = '0x1234567890123456789012345678901234567890';
      const referrerAddress = '0x9876543210987654321098765432109876543210';

      // Mock points address to match referee
      mockGetPointsAddress.mockResolvedValue(refereeAddress);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      await makeApiRequest('/referrals/refer', {
        referee: refereeAddress,
        referrer: referrerAddress,
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/referrals/refer`,
        expect.objectContaining({
          referee: refereeAddress.toLowerCase(),
          referrer: referrerAddress.toLowerCase(),
          signature: mockSignatureBase64,
          parity: 1,
        }),
        expect.any(Object),
      );
    });

    it('should auto-detect address field and include signature', async () => {
      const userAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

      // Mock points address to match user address
      mockGetPointsAddress.mockResolvedValue(userAddress);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      await makeApiRequest(
        '/verify-action',
        {
          action: 'secret_backup',
          address: userAddress,
        },
        undefined,
      );

      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/verify-action`,
        expect.objectContaining({
          action: 'secret_backup',
          address: userAddress.toLowerCase(),
          signature: mockSignatureBase64,
          parity: 1,
        }),
        expect.any(Object),
      );
    });

    it('should prioritize referee over address field', async () => {
      // Edge case: if both exist, referee should be used
      const refereeAddress = '0x1111111111111111111111111111111111111111';
      const addressField = '0x2222222222222222222222222222222222222222';

      // Mock points address to match referee
      mockGetPointsAddress.mockResolvedValue(refereeAddress);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      await makeApiRequest('/some-endpoint', {
        referee: refereeAddress,
        address: addressField,
      });

      // Should sign with referee (first in || chain)
      expect(mockWallet.signMessage).toHaveBeenCalledWith(
        refereeAddress.toLowerCase(),
      );
    });

    it('should not include signature if no address fields present', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      await makeApiRequest('/some-endpoint', {
        someOtherField: 'value',
      });

      // Should not attempt to get private key or sign
      expect(mockUnsafeGetPrivateKey).not.toHaveBeenCalled();
      expect(mockUnsafeGetPointsPrivateKey).not.toHaveBeenCalled();
      expect(mockWallet.signMessage).not.toHaveBeenCalled();

      // Should send request without signature
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/some-endpoint`,
        {
          someOtherField: 'value',
        },
        expect.any(Object),
      );
    });
  });

  describe('makeApiRequest - Response handling', () => {
    beforeEach(() => {
      // Mock points address to match mockAddress so signing works
      mockGetPointsAddress.mockResolvedValue(mockAddress);
      mockUnsafeGetPointsPrivateKey.mockResolvedValue(mockPointsPrivateKey);
      mockWallet.signMessage.mockResolvedValue(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      );
    });

    it('should handle successful 200 response', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { result: 'success' },
      } as AxiosResponse);

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result).toEqual({
        success: true,
        status: 200,
        data: { result: 'success' },
      });
    });

    it('should handle successful 202 response', async () => {
      mockAxios.post.mockResolvedValue({
        status: 202,
        data: { result: 'accepted' },
      } as AxiosResponse);

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result).toEqual({
        success: true,
        status: 202,
        data: { result: 'accepted' },
      });
    });

    it('should handle error responses with custom error messages', async () => {
      mockAxios.post.mockResolvedValue({
        status: 400,
        data: { status: 'already_verified', message: 'Already verified' },
      } as AxiosResponse);

      const errorMessages = {
        already_verified: 'You have already verified this action.',
      };

      const result = await makeApiRequest(
        '/verify-action',
        {
          action: 'secret_backup',
          address: mockAddress,
        },
        errorMessages,
      );

      expect(result).toEqual({
        success: false,
        status: 400,
        error: 'You have already verified this action.',
      });
    });

    it('should handle error responses with generic message from response', async () => {
      mockAxios.post.mockResolvedValue({
        status: 400,
        data: { message: 'Invalid request data' },
      } as AxiosResponse);

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result).toEqual({
        success: false,
        status: 400,
        error: 'Invalid request data',
      });
    });

    it('should handle error responses with fallback message', async () => {
      mockAxios.post.mockResolvedValue({
        status: 500,
        data: {},
      } as AxiosResponse);

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result).toEqual({
        success: false,
        status: 500,
        error: 'An unexpected error occurred. Please try again.',
      });
    });

    it('should handle network errors', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe('Network error');
    });

    it('should handle axios errors with response status', async () => {
      mockAxios.post.mockRejectedValue({
        message: 'Request failed',
        response: { status: 503 },
      });

      const result = await makeApiRequest('/referrals/refer', {
        referee: mockAddress,
        referrer: '0x9876543210987654321098765432109876543210',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(503);
      expect(result.error).toBe('Request failed');
    });
  });

  describe('Integration tests - Full flow', () => {
    beforeEach(() => {
      mockUnsafeGetPrivateKey.mockResolvedValue(mockPrimaryPrivateKey);
      mockUnsafeGetPointsPrivateKey.mockResolvedValue(mockPointsPrivateKey);
      mockWallet.signMessage.mockResolvedValue(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      );
    });

    it('should complete full signature flow for referral endpoint', async () => {
      const refereeAddress = '0x1234567890123456789012345678901234567890';
      const referrerAddress = '0x9876543210987654321098765432109876543210';
      const mockSignatureHex =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

      mockGetPointsAddress.mockResolvedValue(refereeAddress);
      mockWallet.signMessage.mockResolvedValue(mockSignatureHex);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as AxiosResponse);

      const result = await makeApiRequest('/referrals/refer', {
        referee: refereeAddress,
        referrer: referrerAddress,
      });

      // Verify complete flow
      expect(mockUnsafeGetPointsPrivateKey).toHaveBeenCalled();
      expect(ethers.Wallet).toHaveBeenCalledWith(mockPointsPrivateKey);
      expect(mockWallet.signMessage).toHaveBeenCalledWith(
        refereeAddress.toLowerCase(),
      );
      expect(ethers.Signature.from).toHaveBeenCalledWith(mockSignatureHex);
      expect(ethers.getBytes).toHaveBeenCalledWith(mockSignatureHex);
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/referrals/refer`,
        expect.objectContaining({
          referee: refereeAddress.toLowerCase(),
          referrer: referrerAddress.toLowerCase(),
          signature: mockSignatureBase64,
          parity: 1,
        }),
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });

    it('should complete full signature flow for backup endpoint', async () => {
      const userAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const mockSignatureHex =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

      // Mock points address to match user address
      mockGetPointsAddress.mockResolvedValue(userAddress);
      mockWallet.signMessage.mockResolvedValue(mockSignatureHex);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as AxiosResponse);

      const result = await makeApiRequest('/verify-action', {
        action: 'secret_backup',
        address: userAddress,
      });

      // Verify complete flow
      expect(mockUnsafeGetPointsPrivateKey).toHaveBeenCalled();
      expect(mockWallet.signMessage).toHaveBeenCalledWith(
        userAddress.toLowerCase(),
      );
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/verify-action`,
        expect.objectContaining({
          action: 'secret_backup',
          address: userAddress.toLowerCase(),
          signature: mockSignatureBase64,
          parity: 1,
        }),
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });

    it('should complete full signature flow for notification endpoint', async () => {
      const userAddress = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const mockSignatureHex =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';

      // Mock points address to match user address
      mockGetPointsAddress.mockResolvedValue(userAddress);
      mockWallet.signMessage.mockResolvedValue(mockSignatureHex);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { success: true },
      } as AxiosResponse);

      const result = await makeApiRequest('/verify-action', {
        action: 'push_notification',
        address: userAddress,
      });

      // Verify signature included
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/verify-action`,
        expect.objectContaining({
          action: 'push_notification',
          address: userAddress.toLowerCase(),
          signature: mockSignatureBase64,
          parity: 1,
        }),
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      mockUnsafeGetPointsPrivateKey.mockResolvedValue(mockPointsPrivateKey);
      mockWallet.signMessage.mockResolvedValue(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      );
    });

    it('should handle empty body object', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      const result = await makeApiRequest('/some-endpoint', {});

      expect(mockUnsafeGetPointsPrivateKey).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle null address values', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      const result = await makeApiRequest('/some-endpoint', {
        address: null,
      });

      expect(mockUnsafeGetPointsPrivateKey).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle undefined address values', async () => {
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      const result = await makeApiRequest('/some-endpoint', {
        address: undefined,
      });

      expect(mockUnsafeGetPointsPrivateKey).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should lowercase addresses in request body', async () => {
      const mixedCaseReferee = '0xAbCdEf1234567890aBcDeF1234567890AbCdEf12';
      const mixedCaseReferrer = '0xAbCdEf0987654321aBcDeF0987654321AbCdEf09';

      // Mock points address to match referee
      mockGetPointsAddress.mockResolvedValue(mixedCaseReferee);
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: {},
      } as AxiosResponse);

      await makeApiRequest('/referrals/refer', {
        referee: mixedCaseReferee,
        referrer: mixedCaseReferrer,
      });

      // Should sign with lowercase
      expect(mockWallet.signMessage).toHaveBeenCalledWith(
        mixedCaseReferee.toLowerCase(),
      );

      // Should send lowercase in body
      expect(mockAxios.post).toHaveBeenCalledWith(
        `${POINTS_API_BASE_URL}/referrals/refer`,
        expect.objectContaining({
          referee: mixedCaseReferee.toLowerCase(),
          referrer: mixedCaseReferrer.toLowerCase(),
        }),
        expect.any(Object),
      );
    });
  });
});
