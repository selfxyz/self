// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

jest.mock('@env', () => ({
  KYC_TEE_URL: 'https://kyc.self.xyz',
}));

jest.mock('@didit-protocol/sdk-react-native', () => ({
  startVerification: jest.fn(),
}));

describe('kycService', () => {
  let startVerificationMock: jest.Mock;
  let service: typeof import('@/integrations/kyc/kycService');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    startVerificationMock =
      require('@didit-protocol/sdk-react-native').startVerification;
    service = require('@/integrations/kyc/kycService');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the provider result when verification completes in time', async () => {
    startVerificationMock.mockResolvedValue({
      type: 'completed',
      session: {
        status: 'Approved',
        sessionId: 'session-123',
      },
    });

    await expect(service.launchKycVerification('token-123')).resolves.toEqual({
      type: 'completed',
      session: {
        status: 'Approved',
        sessionId: 'session-123',
      },
    });
  });

  it('fails when the provider never resolves', async () => {
    jest.useFakeTimers();
    startVerificationMock.mockReturnValue(new Promise(() => {}));

    const resultPromise = service.launchKycVerification('token-123');
    const rejection = await expect(resultPromise).rejects.toThrow(
      'KYC verification timed out after 30s',
    );

    await jest.advanceTimersByTimeAsync(30000);

    await rejection;
  });
});
