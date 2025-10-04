// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import type { MRZInfo } from '@selfxyz/mobile-sdk-alpha';

import { formatMRZDate, normalizeMRZPayload } from '../../src/screens/documentCameraUtils';

describe('formatMRZDate', () => {
  it('formats valid YYMMDD strings into readable dates', () => {
    expect(formatMRZDate('740812', 'en-US')).toBe('August 12, 1974');
    expect(formatMRZDate('010101', 'en-US')).toBe('January 1, 2001');
  });

  it('returns Unknown for invalid values', () => {
    expect(formatMRZDate('991332', 'en-US')).toBe('Unknown');
    expect(formatMRZDate('abc123', 'en-US')).toBe('Unknown');
  });
});

describe('normalizeMRZPayload', () => {
  it('parses raw MRZ strings and surfaces validation data', () => {
    const rawMRZ =
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';

    const normalized = normalizeMRZPayload(rawMRZ);

    expect(normalized.info.documentNumber).toBe('L898902C3');
    expect(normalized.info.dateOfBirth).toBe('740812');
    expect(normalized.info.dateOfExpiry).toBe('120415');
    expect(normalized.info.validation?.overall).toBe(true);
  });

  it('preserves provided MRZ info when validation already exists', () => {
    const info: MRZInfo = {
      documentNumber: 'X1234567',
      dateOfBirth: '010101',
      dateOfExpiry: '251231',
      issuingCountry: 'UTO',
      documentType: 'P',
      validation: {
        format: true,
        passportNumberChecksum: true,
        dateOfBirthChecksum: true,
        dateOfExpiryChecksum: true,
        compositeChecksum: true,
        overall: true,
      },
    };

    const normalized = normalizeMRZPayload(info);

    expect(normalized.info).toEqual(info);
    expect(normalized.readableBirthDate).toBe(formatMRZDate('010101', 'en-US'));
  });
});
