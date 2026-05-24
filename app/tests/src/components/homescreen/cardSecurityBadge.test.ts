// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData } from '@selfxyz/common';
import type { PassportData } from '@selfxyz/common/types/passport';

import {
  getSecurityBadgeLabel,
  getSecurityLevel,
} from '@/components/homescreen/cardSecurityBadge';

describe('getSecurityBadgeLabel', () => {
  it('describes NFC-backed MRZ documents clearly', () => {
    const passportDocument = {
      documentType: 'passport',
      documentCategory: 'passport',
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<',
      dg2Hash: [1, 2, 3],
    } as PassportData;

    expect(getSecurityBadgeLabel(passportDocument)).toBe('NFC verified');
  });

  it('describes non-NFC MRZ documents clearly', () => {
    const passportDocument = {
      documentType: 'passport',
      documentCategory: 'passport',
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<',
      dg2Hash: [],
    } as PassportData;

    expect(getSecurityBadgeLabel(passportDocument)).toBe('MRZ verified');
  });

  it('describes Aadhaar verification via QR', () => {
    const aadhaarDocument = {
      documentType: 'aadhaar',
      documentCategory: 'aadhaar',
      qrData: 'synthetic-qr-data',
    } as AadhaarData;

    expect(getSecurityBadgeLabel(aadhaarDocument)).toBe('QR verified');
  });

  it('downgrades mock documents to LOW-SECURITY even when dg2Hash is populated', () => {
    const mockPassport = {
      documentType: 'passport',
      documentCategory: 'passport',
      mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<',
      dg2Hash: [1, 2, 3],
    } as PassportData;

    expect(getSecurityLevel(mockPassport, { mock: true })).toBe('LOW-SECURITY');
    expect(getSecurityBadgeLabel(mockPassport, { mock: true })).toBe(
      'MRZ verified',
    );
  });
});
