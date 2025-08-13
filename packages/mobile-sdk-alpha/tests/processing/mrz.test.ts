import { describe, expect, it } from 'vitest';

import { extractMRZInfo, formatDateToYYMMDD } from '../../src';

const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

describe('extractMRZInfo', () => {
  it('parses valid TD3 MRZ', () => {
    const info = extractMRZInfo(sample);
    expect(info.passportNumber).toBe('L898902C3');
    expect(info.validation.overall).toBe(true);
  });

  it('rejects malformed MRZ', () => {
    const invalid = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
    expect(() => extractMRZInfo(invalid)).toThrow();
  });

  it('flags bad check digits', () => {
    const bad = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<11`;
    const info = extractMRZInfo(bad);
    expect(info.validation.overall).toBe(false);
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
    expect(() => formatDateToYYMMDD('invalid')).toThrow();
  });
});
