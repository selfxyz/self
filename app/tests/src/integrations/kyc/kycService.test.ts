// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import { startVerification } from '@didit-protocol/sdk-react-native';

import {
  createKycSession,
  isRetryableKycFailure,
  launchKycVerification,
} from '@/integrations/kyc/kycService';

jest.mock('@env', () => ({
  KYC_TEE_URL: 'https://kyc-tee.test',
}));

jest.mock('@didit-protocol/sdk-react-native', () => ({
  startVerification: jest.fn(),
}));

const mockStartVerification = startVerification as jest.Mock;

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

describe('launchKycVerification', () => {
  const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  const originalVersion = Object.getOwnPropertyDescriptor(Platform, 'Version')!;

  const setPlatform = (os: string, version: number | string) => {
    Object.defineProperty(Platform, 'OS', {
      get: () => os,
      configurable: true,
    });
    Object.defineProperty(Platform, 'Version', {
      get: () => version,
      configurable: true,
    });
  };

  beforeEach(() => {
    mockStartVerification.mockResolvedValue({
      type: 'completed',
      session: { status: 'Approved', sessionId: 'sid' },
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', originalOS);
    Object.defineProperty(Platform, 'Version', originalVersion);
    mockStartVerification.mockReset();
  });

  it('fails without launching the SDK on Android below API 28', async () => {
    setPlatform('android', 27);

    const result = await launchKycVerification('tok');

    expect(result.type).toBe('failed');
    expect(result.error?.type).toBe('unsupportedDevice');
    expect(mockStartVerification).not.toHaveBeenCalled();
  });

  it('launches the SDK on Android API 28 and above', async () => {
    setPlatform('android', 28);

    const result = await launchKycVerification('tok');

    expect(mockStartVerification).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({ languageCode: 'en' }),
    );
    expect(result.type).toBe('completed');
  });

  it('launches the SDK on iOS regardless of version', async () => {
    setPlatform('ios', '15.0');

    const result = await launchKycVerification('tok');

    expect(mockStartVerification).toHaveBeenCalled();
    expect(result.type).toBe('completed');
  });
});

describe('isRetryableKycFailure', () => {
  it('is false for unsupportedDevice failures', () => {
    expect(
      isRetryableKycFailure({
        type: 'failed',
        error: { type: 'unsupportedDevice', message: 'unsupported' },
      }),
    ).toBe(false);
  });

  it('is true for other failure types', () => {
    expect(
      isRetryableKycFailure({
        type: 'failed',
        error: { type: 'networkError', message: 'offline' },
      }),
    ).toBe(true);
  });

  it('is true when no error details are present', () => {
    expect(isRetryableKycFailure({ type: 'failed' })).toBe(true);
  });
});
