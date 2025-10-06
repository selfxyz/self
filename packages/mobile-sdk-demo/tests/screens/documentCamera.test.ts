// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import type { MRZInfo } from '@selfxyz/mobile-sdk-alpha';

// Mock extractMRZInfo directly in this test file
vi.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  extractMRZInfo: vi.fn((_mrz: string) => {
    // Mock implementation that returns basic MRZ info
    return {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
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
  }),
}));

import { buildValidationRows, formatMRZDate, humanizeDocumentType, normalizeMRZPayload } from '../../src/utils/camera';

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
    const rawMRZ = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';

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

describe('humanizeDocumentType', () => {
  it('maps known document codes to friendly labels', () => {
    expect(humanizeDocumentType('P')).toBe('Passport');
    expect(humanizeDocumentType('I')).toBe('ID Card');
  });

  it('falls back to normalized text for unknown values', () => {
    expect(humanizeDocumentType('  visa ')).toBe('VISA');
    expect(humanizeDocumentType('')).toBe('Unknown');
  });
});

describe('buildValidationRows', () => {
  it('returns null when validation is unavailable', () => {
    expect(buildValidationRows(undefined)).toBeNull();
  });

  it('maps MRZ validation flags into labelled rows', () => {
    const rows = buildValidationRows({
      format: true,
      passportNumberChecksum: true,
      dateOfBirthChecksum: false,
      dateOfExpiryChecksum: true,
      compositeChecksum: true,
      overall: false,
    });

    expect(rows).toMatchObject([
      { label: 'Format', value: true },
      { label: 'Document number checksum', value: true },
      { label: 'Date of birth checksum', value: false },
      { label: 'Expiry date checksum', value: true },
      { label: 'Composite checksum', value: true },
      { label: 'Overall validation', value: false },
    ]);
  });
});
