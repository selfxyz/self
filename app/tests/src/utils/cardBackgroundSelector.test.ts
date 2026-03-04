// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { IDDocument } from '@selfxyz/new-common';
import { serializeKycData } from '@selfxyz/new-common';

import { getBackgroundIndex } from '@/utils/cardBackgroundSelector';

const BACKGROUND_COUNT = 6;

function createKycDocument(serializedApplicantInfo: string): IDDocument {
  return {
    documentCategory: 'kyc',
    documentType: 'drivers_licence',
    mock: false,
    serializedApplicantInfo,
    signature: '',
    pubkey: [],
  };
}

describe('getBackgroundIndex', () => {
  it('returns a deterministic index for a valid KYC payload', () => {
    const serializedData = serializeKycData({
      country: 'USA',
      idType: 'passport',
      idNumber: 'P1234567',
      issuanceDate: '2020-01-01',
      expiryDate: '2030-01-01',
      fullName: 'Jane Doe',
      dob: '1990-01-01',
      photoHash: 'photohash',
      phoneNumber: '+1234567890',
      gender: 'F',
      address: '123 Main St',
    });
    const serializedApplicantInfo = Buffer.from(
      serializedData,
      'utf-8',
    ).toString('base64');

    const document = createKycDocument(serializedApplicantInfo);

    const firstIndex = getBackgroundIndex(document);
    const secondIndex = getBackgroundIndex(document);

    expect(firstIndex).toBe(secondIndex);
    expect(firstIndex).toBeGreaterThanOrEqual(1);
    expect(firstIndex).toBeLessThanOrEqual(BACKGROUND_COUNT);
  });

  it('does not throw for malformed KYC payload and still returns a valid index', () => {
    const document = createKycDocument(undefined as unknown as string);

    expect(() => getBackgroundIndex(document)).not.toThrow();

    const index = getBackgroundIndex(document);
    expect(index).toBeGreaterThanOrEqual(1);
    expect(index).toBeLessThanOrEqual(BACKGROUND_COUNT);
  });
});
