// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createKycSession, launchKycVerification } from '@/integrations/kyc/kycService';

jest.mock('@env', () => ({
  KYC_TEE_URL: 'https://kyc.example.com',
}));

const mockStartVerification = jest.fn();

jest.mock('@didit-protocol/sdk-react-native', () => ({
  startVerification: (...args: unknown[]) => mockStartVerification(...args),
}));

describe('kycService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('createKycSession', () => {
    it('returns parsed response when backend returns JSON object', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          sessionId: 'session-1',
          sessionToken: 'token-1',
        }),
      });

      await expect(createKycSession()).resolves.toEqual({
        sessionId: 'session-1',
        sessionToken: 'token-1',
      });
    });

    it('throws when backend response is missing sessionToken', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ sessionId: 'session-1' }),
      });

      await expect(createKycSession()).rejects.toThrow(
        'Failed to create KYC session: Missing session token in response',
      );
    });
  });

  describe('launchKycVerification', () => {
    it('throws when sessionToken is empty', async () => {
      await expect(launchKycVerification('   ')).rejects.toThrow(
        'Failed to launch KYC verification: Session token is required',
      );
    });

    it('calls Didit SDK with default options', async () => {
      mockStartVerification.mockResolvedValue({
        type: 'completed',
        session: { status: 'approved', sessionId: 'session-1' },
      });

      await launchKycVerification('token-1');

      expect(mockStartVerification).toHaveBeenCalledWith('token-1', {
        languageCode: 'en',
        loggingEnabled: __DEV__,
      });
    });
  });
});
