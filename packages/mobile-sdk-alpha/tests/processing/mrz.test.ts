// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { MrzParseError } from '../../src/errors';
import { extractMRZInfo, formatDateToYYMMDD } from '../../src/processing/mrz';

const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

const sampleTD1 = `IDFRAX4RTBPFW46<<<<<<<<<<<<<<<9007138M3002119ESP6DUMMY<<DUMMY<<<<<<<<<<<<<<<<<<`;

describe('extractMRZInfo', () => {
  it('parses valid TD3 MRZ', () => {
    const info = extractMRZInfo(sample);
    expect(info.documentNumber).toBe('L898902C3');
    expect(info.validation).toBeDefined();
    expect(info.validation?.overall).toBe(true);
  });

  it('parses valid TD1 MRZ', () => {
    const info = extractMRZInfo(sampleTD1);
    expect(info.documentNumber).toBe('X4RTBPFW4');
    expect(info.issuingCountry).toBe('FRA');
    expect(info.dateOfBirth).toBe('900713');
    expect(info.dateOfExpiry).toBe('300211');
    expect(info.validation).toBeDefined();
    expect(info.validation?.overall).toBe(true);
  });

  it('rejects invalid TD1 MRZ', () => {
    const invalid = `FRAX4RTBPFW46`;
    expect(() => extractMRZInfo(invalid)).toThrow();
  });

  it('Fails overall validation for invalid TD1 MRZ', () => {
    const invalid = `IDFRAX4RTBPFW46`;
    const info = extractMRZInfo(invalid);
    expect(info.validation).toBeDefined();
    expect(info.validation?.overall).toBe(false);
  });

  it('parses valid TD1 MRZ', () => {
    const info = extractMRZInfo(sampleTD1);
    expect(info.documentNumber).toBe('X4RTBPFW4');
    expect(info.issuingCountry).toBe('FRA');
    expect(info.dateOfBirth).toBe('900713');
    expect(info.dateOfExpiry).toBe('300211');
    expect(info.validation?.overall).toBe(true);
  });

  it('rejects invalid TD1 MRZ', () => {
    const invalid = `FRAX4RTBPFW46`;
    expect(() => extractMRZInfo(invalid)).toThrow();
  });

  it('Fails overall validation for invalid TD1 MRZ', () => {
    const invalid = `IDFRAX4RTBPFW46`;
    const info = extractMRZInfo(invalid);
    expect(info.validation?.overall).toBe(false);
  });

  it('parses valid TD1 MRZ', () => {
    const info = extractMRZInfo(sampleTD1);
    expect(info.documentNumber).toBe('X4RTBPFW4');
    expect(info.issuingCountry).toBe('FRA');
    expect(info.dateOfBirth).toBe('900713');
    expect(info.dateOfExpiry).toBe('300211');
    expect(info.validation?.overall).toBe(true);
  });

  it('rejects invalid TD1 MRZ', () => {
    const invalid = `FRAX4RTBPFW46`;
    expect(() => extractMRZInfo(invalid)).toThrow();
  });

  it('Fails overall validation for invalid TD1 MRZ', () => {
    const invalid = `IDFRAX4RTBPFW46`;
    const info = extractMRZInfo(invalid);
    expect(info.validation?.overall).toBe(false);
  });

  it('rejects malformed MRZ', () => {
    const invalid = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
    expect(() => extractMRZInfo(invalid)).toThrowError(MrzParseError);
  });

  it('flags bad check digits', () => {
    const bad = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<11`;
    const info = extractMRZInfo(bad);
    expect(info.validation).toBeDefined();
    expect(info.validation?.overall).toBe(false);
  });
});

describe('formatDateToYYMMDD', () => {
  it('formats ISO dates', () => {
    expect(formatDateToYYMMDD('1974-08-12')).toBe('740812');
  });

  it('handles two-digit years', () => {
    expect(formatDateToYYMMDD('74-08-12')).toBe('740812');
  });

  it('throws on invalid input', () => {
    expect(() => formatDateToYYMMDD('invalid')).toThrowError(MrzParseError);
  });
});
