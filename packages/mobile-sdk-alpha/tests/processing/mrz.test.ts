// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { MrzParseError } from '../../src/errors';
import { extractMRZInfo, extractNameFromMRZ, formatDateToYYMMDD } from '../../src/processing/mrz';

const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

const sampleTD1 = `IDFRAX4RTBPFW46<<<<<<<<<<<<<<<
9007138M3002119ESP<<<<<<<<<<<6
DUMMY<<DUMMY<<<<<<<<<<<<<<<<<<`;

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

describe('extractNameFromMRZ', () => {
  describe('TD3 format (passports)', () => {
    it('extracts first and last name from standard TD3 MRZ', () => {
      const mrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'ANNA MARIA',
        lastName: 'ERIKSSON',
      });
    });

    it('extracts name with single first name', () => {
      const mrz = `P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
123456789USA8501011M2501015<<<<<<<<<<<<<<04`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'JOHN',
        lastName: 'DOE',
      });
    });

    it('extracts name with multiple first names', () => {
      const mrz = `P<FRAMARTIN<<JEAN<PAUL<PIERRE<<<<<<<<<<<<<<<<<
AB123456FRA7501011M2501015<<<<<<<<<<<<<<04`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'JEAN PAUL PIERRE',
        lastName: 'MARTIN',
      });
    });

    it('extracts hyphenated last name (converted to space)', () => {
      const mrz = `P<GBRDUPONT<SMITH<<MARY<JANE<<<<<<<<<<<<<<<<<<<
123456789GBR8001011F2601015<<<<<<<<<<<<<<04`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'MARY JANE',
        lastName: 'DUPONT SMITH',
      });
    });

    it('handles last name only', () => {
      const mrz = `P<DEUSCHMIDT<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
987654321DEU7001011M2301015<<<<<<<<<<<<<<04`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: '',
        lastName: 'SCHMIDT',
      });
    });

    it('extracts name from actual sample MRZ', () => {
      const name = extractNameFromMRZ(sample);
      expect(name).toEqual({
        firstName: 'ANNA MARIA',
        lastName: 'ERIKSSON',
      });
    });

    it('extracts name from single-line 88-character MRZ string', () => {
      const singleLine = 'P<USALUBOWITZ<<CHEYANNE<<<<<<<<<<<<<<<<<<<<<GA4NIPBNI4USA0410011M3010015<<<<<<<<<<<<<<<2';
      const name = extractNameFromMRZ(singleLine);
      expect(name).toEqual({
        firstName: 'CHEYANNE',
        lastName: 'LUBOWITZ',
      });
    });

    it('extracts name from single-line 88-character MRZ with apostrophe', () => {
      const singleLine = "P<USAD'AMORE<<WINSTON<<<<<<<<<<<<<<<<<<<<<<<I22R2I3NB4USA0410011M3010015<<<<<<<<<<<<<<<2";
      const name = extractNameFromMRZ(singleLine);
      expect(name).toEqual({
        firstName: 'WINSTON',
        lastName: "D'AMORE",
      });
    });

    it('extracts name from single-line 88-character MRZ with multiple first names', () => {
      const singleLine = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';
      const name = extractNameFromMRZ(singleLine);
      expect(name).toEqual({
        firstName: 'ANNA MARIA',
        lastName: 'ERIKSSON',
      });
    });
  });

  describe('TD1 format (ID cards)', () => {
    it('extracts first and last name from TD1 MRZ', () => {
      const mrz = `IDFRAD9202541<<<<<<<<<<<<<<<<<
9007138M3002119FRA<<<<<<<<<<<6
DUPONT<<JEAN<<<<<<<<<<<<<<<<<`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'JEAN',
        lastName: 'DUPONT',
      });
    });

    it('extracts name from actual TD1 sample', () => {
      const name = extractNameFromMRZ(sampleTD1);
      expect(name).toEqual({
        firstName: 'DUMMY',
        lastName: 'DUMMY',
      });
    });

    it('extracts name with multiple first names from TD1', () => {
      const mrz = `IDESPY123456789<<<<<<<<<<<<<<
9501011M3012319ESP<<<<<<<<<<<8
GARCIA<<MARIA<CARMEN<ROSA<<<<`;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'MARIA CARMEN ROSA',
        lastName: 'GARCIA',
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('returns null for empty string', () => {
      expect(extractNameFromMRZ('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(extractNameFromMRZ('   \n  ')).toBeNull();
    });

    it('returns null for invalid MRZ format', () => {
      const invalid = 'INVALID MRZ DATA';
      expect(extractNameFromMRZ(invalid)).toBeNull();
    });

    it('returns null for wrong line count', () => {
      const invalid = 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<';
      expect(extractNameFromMRZ(invalid)).toBeNull();
    });

    it('handles MRZ with varying line lengths', () => {
      // Even with short lines, if format is recognizable, it should extract
      const mrz = `P<USADOE<<JOHN<<
123456789USA8501011M2501015`;
      const name = extractNameFromMRZ(mrz);
      // Should still extract name even if lines are short
      expect(name).toEqual({
        firstName: 'JOHN',
        lastName: 'DOE',
      });
    });

    it('returns null for non-string input', () => {
      expect(extractNameFromMRZ(null as any)).toBeNull();
      expect(extractNameFromMRZ(undefined as any)).toBeNull();
    });

    it('handles MRZ with extra whitespace', () => {
      const mrz = `  P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  123456789USA8501011M2501015<<<<<<<<<<<<<<04  `;
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'JOHN',
        lastName: 'DOE',
      });
    });

    it('handles MRZ with Windows line endings', () => {
      const mrz = 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\r\n123456789USA8501011M2501015<<<<<<<<<<<<<<04';
      const name = extractNameFromMRZ(mrz);
      expect(name).toEqual({
        firstName: 'JOHN',
        lastName: 'DOE',
      });
    });
  });
});
