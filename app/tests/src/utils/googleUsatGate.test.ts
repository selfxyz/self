// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  getAllDocuments,
  isGoogleUsatProofRequest,
} from '@selfxyz/mobile-sdk-alpha';

import {
  evaluateGoogleUsatGate,
  FORCE_GOOGLE_USAT_FOR_TESTING,
} from '@/utils/googleUsatGate';

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
    mockGetAllDocuments.mockResolvedValue({});
  });

  it('treats non Google USAT requests according to the force-test toggle', async () => {
    // While FORCE_GOOGLE_USAT_FOR_TESTING is on, every request is gated as if
    // it were a USAT request, so an empty doc catalog blocks. When the toggle
    // is removed, this should allow without consulting the catalog.
    const result = await evaluateGoogleUsatGate({} as any, app);
    const expected = FORCE_GOOGLE_USAT_FOR_TESTING ? 'block' : 'allow';
    const expectedGetAllDocumentsCalls = FORCE_GOOGLE_USAT_FOR_TESTING ? 1 : 0;
    expect(result).toBe(expected);
    expect(mockGetAllDocuments).toHaveBeenCalledTimes(
      expectedGetAllDocumentsCalls,
    );
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

  it('exposes testing force toggle', () => {
    expect(typeof FORCE_GOOGLE_USAT_FOR_TESTING).toBe('boolean');
  });
});
