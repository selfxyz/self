// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import type { KycProviderResult } from '../../types/kycProvider';
import { buildKycDocument } from '../buildKycDocument';

vi.mock('@selfxyz/mobile-sdk-alpha/browser', () => ({
  deserializeApplicantInfo: (base64: string) => {
    const isRealDoc = atob(base64).includes('real');
    return {
      country: 'US',
      idType: 'passport',
      idNumber: isRealDoc ? 'ABC123456' : 'Mock12345',
      issuanceDate: '2020-01-01',
      expiryDate: '2030-01-01',
      fullName: 'John Doe',
      dob: '1990-01-01',
      photoHash: 'abc123',
      phoneNumber: '',
      gender: 'M',
      address: '',
    };
  },
}));

describe('buildKycDocument', () => {
  const makeResult = (overrides?: Partial<KycProviderResult>): KycProviderResult => ({
    status: 'success',
    verificationId: 'v-123',
    provider: 'didit',
    attestation: {
      serializedApplicantInfo: btoa('real-applicant-info'),
      signature: 'sig-abc',
      pubkey: ['pk1', 'pk2'],
    },
    ...overrides,
  });

  it('constructs KycData from a valid attestation', () => {
    const result = buildKycDocument(makeResult());

    expect(result).toEqual({
      documentType: 'passport',
      documentCategory: 'kyc',
      mock: false,
      serializedApplicantInfo: makeResult().attestation!.serializedApplicantInfo,
      signature: 'sig-abc',
      pubkey: ['pk1', 'pk2'],
    });
  });

  it('detects mock documents by idNumber prefix', () => {
    const result = buildKycDocument(
      makeResult({
        attestation: {
          serializedApplicantInfo: btoa('mock-applicant-info'),
          signature: 'sig-mock',
          pubkey: ['pk1', 'pk2'],
        },
      }),
    );

    expect(result.mock).toBe(true);
  });

  it('throws when attestation is missing', () => {
    expect(() => buildKycDocument(makeResult({ attestation: undefined }))).toThrow(
      'Cannot build KYC document: attestation missing',
    );
  });
});
