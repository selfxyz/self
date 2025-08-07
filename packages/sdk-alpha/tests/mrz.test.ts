import { describe, expect, it } from 'vitest';

import { extractMRZInfo, formatDateToYYMMDD } from '../src/processing/mrz.js';

describe('mrz helpers', () => {
  it('extracts fields from TD3 MRZ', () => {
    const sample =
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
    const info = extractMRZInfo(sample);
    expect(info.passportNumber).toBe('L898902C3');
    expect(info.dateOfBirth).toBe('740812');
    expect(info.dateOfExpiry).toBe('120415');
    expect(info.documentType).toBe('P');
    expect(info.countryCode).toBe('UTO');
  });

  it('formats ISO date to YYMMDD', () => {
    expect(formatDateToYYMMDD('1974-08-12')).toBe('740812');
  });
});
