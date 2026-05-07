// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  getAllDocuments,
  isGoogleUsatProofRequest,
} from '@selfxyz/mobile-sdk-alpha';

import { evaluateGoogleUsatGate } from '@/utils/googleUsatGate';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  getAllDocuments: jest.fn(),
  isGoogleUsatProofRequest: jest.fn(),
}));

const mockGetAllDocuments = getAllDocuments as jest.MockedFunction<
  typeof getAllDocuments
>;
const mockIsGoogleUsatProofRequest =
  isGoogleUsatProofRequest as jest.MockedFunction<
    typeof isGoogleUsatProofRequest
  >;

describe('evaluateGoogleUsatGate', () => {
  const app = {
    sessionId: 'session-id',
    endpointType: 'celo',
    chainID: 42220,
    endpoint: '0xabc',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsGoogleUsatProofRequest.mockReturnValue(false);
  });

  afterEach(() => {
    (globalThis as typeof globalThis & { __FORCE_GOOGLE_USAT__?: boolean })
      .__FORCE_GOOGLE_USAT__ = false;
  });

  it('allows non Google USAT requests', async () => {
    const result = await evaluateGoogleUsatGate({} as any, app);
    expect(result).toBe('allow');
    expect(mockGetAllDocuments).not.toHaveBeenCalled();
  });

  it('blocks Google USAT when catalog is empty', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    mockGetAllDocuments.mockResolvedValue({});
    await expect(evaluateGoogleUsatGate({} as any, app)).resolves.toBe('block');
  });

  it('allows Google USAT when non-kyc doc exists', async () => {
    mockIsGoogleUsatProofRequest.mockReturnValue(true);
    mockGetAllDocuments.mockResolvedValue({
      a: { data: { documentCategory: 'kyc' } } as any,
      b: { data: { documentCategory: 'passport' } } as any,
    });
    await expect(evaluateGoogleUsatGate({} as any, app)).resolves.toBe('allow');
  });

  it('honors force flag in dev', async () => {
    (globalThis as typeof globalThis & { __FORCE_GOOGLE_USAT__?: boolean })
      .__FORCE_GOOGLE_USAT__ = true;
    mockGetAllDocuments.mockResolvedValue({});
    await expect(evaluateGoogleUsatGate({} as any, app)).resolves.toBe('block');
  });
});
