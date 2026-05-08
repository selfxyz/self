// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { createKycSession } from '@/integrations/kyc/kycService';

jest.mock('@env', () => ({
  KYC_TEE_URL: 'https://kyc-tee.test',
}));

jest.mock('@didit-protocol/sdk-react-native', () => ({
  startVerification: jest.fn(),
}));

describe('createKycSession', () => {
  const okResponse = () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ sessionId: 'sid', sessionToken: 'tok' }),
    }) as unknown as Response;

  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse());
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const getBody = () => {
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    return JSON.parse(init.body as string);
  };

  it('sends expectedDetails when both country and nationality are provided', async () => {
    await createKycSession({ country: 'USA', nationality: 'USA' });
    expect(getBody()).toEqual({
      expectedDetails: { country: 'USA', nationality: 'USA' },
    });
  });

  it('omits expectedDetails when called with no argument', async () => {
    await createKycSession();
    expect(getBody()).toEqual({});
  });

  it('omits expectedDetails when country is empty', async () => {
    await createKycSession({ country: '', nationality: 'USA' });
    expect(getBody()).toEqual({});
  });

  it('omits expectedDetails when nationality is empty', async () => {
    await createKycSession({ country: 'USA', nationality: '' });
    expect(getBody()).toEqual({});
  });

  it('returns the parsed session response', async () => {
    const result = await createKycSession({
      country: 'IND',
      nationality: 'IND',
    });
    expect(result).toEqual({ sessionId: 'sid', sessionToken: 'tok' });
  });

  it('parses a string-encoded JSON response body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => '{"sessionId":"sid","sessionToken":"tok"}',
    } as unknown as Response);

    const result = await createKycSession({
      country: 'USA',
      nationality: 'USA',
    });
    expect(result).toEqual({ sessionId: 'sid', sessionToken: 'tok' });
  });
});
