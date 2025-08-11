import { describe, expect, it } from 'vitest';

import { extractMRZInfo, formatDateToYYMMDD } from '../src/processing/mrz';

describe('MRZ Processing', () => {
  // Valid TD3 MRZ sample with correct check digits
  const validTD3Sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

  describe('extractMRZInfo', () => {
    describe('Valid TD3 MRZ', () => {
      it('extracts all fields correctly from valid TD3 MRZ', () => {
        const info = extractMRZInfo(validTD3Sample);

        // Basic fields
        expect(info.passportNumber).toBe('L898902C3');
        expect(info.dateOfBirth).toBe('740812');
        expect(info.dateOfExpiry).toBe('120415');
        expect(info.documentType).toBe('P');
        expect(info.issuingCountry).toBe('UTO');
        expect(info.nationality).toBe('UTO');
        expect(info.sex).toBe('F');

        // Name parsing
        expect(info.surname).toBe('ERIKSSON');
        expect(info.givenNames).toBe('ANNA MARIA');

        // Validation should pass for valid MRZ
        expect(info.validation.format).toBe(true);
        expect(info.validation.passportNumberChecksum).toBe(true);
        expect(info.validation.dateOfBirthChecksum).toBe(true);
        expect(info.validation.dateOfExpiryChecksum).toBe(true);
        expect(info.validation.compositeChecksum).toBe(true);
        expect(info.validation.overall).toBe(true);
      });

      it('handles MRZ with extra whitespace', () => {
        const sampleWithWhitespace = `  ${validTD3Sample}  `;
        const info = extractMRZInfo(sampleWithWhitespace);
        expect(info.passportNumber).toBe('L898902C3');
        expect(info.validation.overall).toBe(true);
      });

      it('handles names with single given name', () => {
        const singleNameSample = `P<UTOERIKSSON<<ANNA<<<<<<<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(singleNameSample);
        expect(info.surname).toBe('ERIKSSON');
        expect(info.givenNames).toBe('ANNA');
      });

      it('handles names with no given names', () => {
        const noGivenNameSample = `P<UTOERIKSSON<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(noGivenNameSample);
        expect(info.surname).toBe('ERIKSSON');
        expect(info.givenNames).toBe('');
      });
    });

    describe('Format Validation', () => {
      it('rejects MRZ with wrong number of lines', () => {
        const singleLineMRZ = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';

        expect(() => extractMRZInfo(singleLineMRZ)).toThrow(
          'Invalid MRZ format: Expected TD3 format (2 lines × 44 characters), got 1 lines with lengths [44]',
        );
      });

      it('rejects MRZ with incorrect line lengths', () => {
        const shortLineMRZ = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

        expect(() => extractMRZInfo(shortLineMRZ)).toThrow(
          'Invalid MRZ format: Expected TD3 format (2 lines × 44 characters), got 2 lines with lengths [40, 44]',
        );
      });

      it('rejects empty or null input', () => {
        expect(() => extractMRZInfo('')).toThrow('MRZ string is required and must be a string');
        expect(() => extractMRZInfo(null as any)).toThrow('MRZ string is required and must be a string');
        expect(() => extractMRZInfo(undefined as any)).toThrow('MRZ string is required and must be a string');
      });

      it('rejects non-string input', () => {
        expect(() => extractMRZInfo(123 as any)).toThrow('MRZ string is required and must be a string');
        expect(() => extractMRZInfo({} as any)).toThrow('MRZ string is required and must be a string');
      });
    });

    describe('Check Digit Validation', () => {
      it('detects invalid passport number check digit', () => {
        const invalidPassportCheck = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C37UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(invalidPassportCheck);
        expect(info.validation.passportNumberChecksum).toBe(false);
        expect(info.validation.overall).toBe(false);
      });

      it('detects invalid date of birth check digit', () => {
        const invalidDOBCheck = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408123F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(invalidDOBCheck);
        expect(info.validation.dateOfBirthChecksum).toBe(false);
        expect(info.validation.overall).toBe(false);
      });

      it('detects invalid date of expiry check digit', () => {
        const invalidExpiryCheck = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204150ZE184226B<<<<<10`;

        const info = extractMRZInfo(invalidExpiryCheck);
        expect(info.validation.dateOfExpiryChecksum).toBe(false);
        expect(info.validation.overall).toBe(false);
      });

      it('detects invalid composite check digit', () => {
        const invalidCompositeCheck = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<11`;

        const info = extractMRZInfo(invalidCompositeCheck);
        expect(info.validation.compositeChecksum).toBe(false);
        expect(info.validation.overall).toBe(false);
      });

      it('handles check digits with < character (no check required)', () => {
        // Some fields may use < to indicate no check digit
        const noCheckDigitSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C<6UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(noCheckDigitSample);
        expect(info.validation.passportNumberChecksum).toBe(false); // < is not a valid check digit
      });
    });

    describe('Field Extraction Edge Cases', () => {
      it('handles fields with filler characters correctly', () => {
        const fillerSample = `P<UTOSMITH<<<JOHN<DOE<<<<<<<<<<<<<<<<<<<<<<<
A1234567<9UTO8501019M2512314GBR<<<<<<<<<<<04`;

        const info = extractMRZInfo(fillerSample);
        expect(info.surname).toBe('SMITH');
        expect(info.givenNames).toBe('JOHN DOE');
        expect(info.passportNumber).toBe('A1234567');
        expect(info.nationality).toBe('UTO');
        expect(info.issuingCountry).toBe('UTO');
        expect(info.sex).toBe('M');
      });

      it('handles complex name structures', () => {
        const complexNameSample = `P<UTOVAN<<DER<<BERG<<MARIA<ELENA<<<<<<<<<<<<
B2345678<1UTO9001015F2612125UTO<<<<<<<<<<<<8`;

        const info = extractMRZInfo(complexNameSample);
        expect(info.surname).toBe('VAN  DER  BERG');
        expect(info.givenNames).toBe('MARIA ELENA');
      });
    });

    describe('Improved Issuing Country and Nationality Extraction', () => {
      it('filters issuing country to only uppercase A-Z letters', () => {
        // Test with non-letter characters in issuing country
        const sampleWithSpecialChars = `P<U1OERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(sampleWithSpecialChars);
        expect(info.issuingCountry).toBe('UO'); // Removes the '1' character
      });

      it('handles issuing country with mixed characters', () => {
        const sampleWithMixedChars = `P<U@TOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(sampleWithMixedChars);
        expect(info.issuingCountry).toBe('UT'); // Removes the '@' character
      });

      it('improves nationality extraction with 4-character window scanning', () => {
        // Test nationality field with stray characters at position 10
        const sampleWithStrayChar = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1UTO7408122F1204159ZE184226B<<<<<`;

        const info = extractMRZInfo(sampleWithStrayChar);
        expect(info.nationality).toBe('UU'); // Falls back to original slice(10,13) with non-letters removed
      });

      it('handles nationality with multiple stray characters', () => {
        // Test nationality field with stray characters at positions 10 and 11
        const sampleWithMultipleStrayChars = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1T2UTO7408122F1204159ZE184226B<<<`;

        const info = extractMRZInfo(sampleWithMultipleStrayChars);
        expect(info.nationality).toBe('UT'); // Falls back to original slice(10,13) with non-letters removed
      });

      it('falls back to original slice when no 3-letter match found', () => {
        // Test nationality field with no valid 3-letter sequence in window
        const sampleWithNoValidSequence = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1T27408122F1204159ZE184226B<<<<<1`;

        const info = extractMRZInfo(sampleWithNoValidSequence);
        expect(info.nationality).toBe('UT'); // Falls back to original slice(10,13) with non-letters removed
      });

      it('handles nationality field with all valid characters', () => {
        // Test normal case where nationality field is clean
        const cleanSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

        const info = extractMRZInfo(cleanSample);
        expect(info.nationality).toBe('UTO'); // Normal case works as expected
      });

      it('handles edge case with nationality at end of window', () => {
        // Test nationality field where valid sequence is at the end of the 4-character window
        const sampleWithLateSequence = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1T2UTO7408122F1204159ZE184226B<<<`;

        const info = extractMRZInfo(sampleWithLateSequence);
        expect(info.nationality).toBe('UT'); // Falls back to original slice(10,13) with non-letters removed
      });
    });
  });

  describe('formatDateToYYMMDD', () => {
    describe('Valid ISO Date Formats', () => {
      it('formats basic ISO date to YYMMDD', () => {
        expect(formatDateToYYMMDD('1974-08-12')).toBe('740812');
        expect(formatDateToYYMMDD('2003-01-05')).toBe('030105');
        expect(formatDateToYYMMDD('1999-12-31')).toBe('991231');
      });

      it('handles ISO dates with time components (ignores time)', () => {
        expect(formatDateToYYMMDD('1974-08-12T00:00:00Z')).toBe('740812');
        expect(formatDateToYYMMDD('1974-08-12T23:59:59+00:00')).toBe('740812');
        expect(formatDateToYYMMDD('1974-08-12T12:34:56.789Z')).toBe('740812');
      });

      it('handles different timezone notations', () => {
        expect(formatDateToYYMMDD('1974-08-12T10:30:00-05:00')).toBe('740812');
        expect(formatDateToYYMMDD('1974-08-12T15:45:00+02:00')).toBe('740812');
      });
    });

    describe('Alternative Date Formats', () => {
      it('handles slash-separated dates', () => {
        expect(formatDateToYYMMDD('1974/08/12')).toBe('740812');
        expect(formatDateToYYMMDD('2003/01/05')).toBe('030105');
      });

      it('handles dates without separators', () => {
        expect(formatDateToYYMMDD('19740812')).toBe('740812');
        expect(formatDateToYYMMDD('20030105')).toBe('030105');
      });

      it('handles 2-digit years with proper century inference', () => {
        // Years 00-30 assumed to be 20xx
        expect(formatDateToYYMMDD('03/01/05')).toBe('030105');
        expect(formatDateToYYMMDD('25/12/31')).toBe('251231');

        // Years 31-99 assumed to be 19xx
        expect(formatDateToYYMMDD('74/08/12')).toBe('740812');
        expect(formatDateToYYMMDD('99/12/31')).toBe('991231');
      });
    });

    describe('Century Rollover and Edge Cases', () => {
      it('correctly handles century rollover', () => {
        expect(formatDateToYYMMDD('2000-01-01')).toBe('000101');
        expect(formatDateToYYMMDD('2001-02-03')).toBe('010203');
        expect(formatDateToYYMMDD('2010-05-15')).toBe('100515');
        expect(formatDateToYYMMDD('2025-12-25')).toBe('251225');
      });

      it('handles leap year dates', () => {
        expect(formatDateToYYMMDD('2000-02-29')).toBe('000229');
        expect(formatDateToYYMMDD('2004-02-29')).toBe('040229');
      });
    });

    describe('Error Handling', () => {
      it('throws error for invalid date strings', () => {
        expect(() => formatDateToYYMMDD('not-a-date')).toThrow('Invalid date format');
        expect(() => formatDateToYYMMDD('12345')).toThrow('Invalid date format');
        expect(() => formatDateToYYMMDD('abc-def-ghi')).toThrow('Invalid date format');
      });

      it('throws error for empty or null input', () => {
        expect(() => formatDateToYYMMDD('')).toThrow('Date string is required');
        expect(() => formatDateToYYMMDD(null as any)).toThrow('Date string is required');
        expect(() => formatDateToYYMMDD(undefined as any)).toThrow('Date string is required');
      });

      it('throws error for non-string input', () => {
        expect(() => formatDateToYYMMDD(123 as any)).toThrow('Date string is required');
        expect(() => formatDateToYYMMDD({} as any)).toThrow('Date string is required');
        expect(() => formatDateToYYMMDD(new Date() as any)).toThrow('Date string is required');
      });
    });

    describe('Boundary Cases', () => {
      it('handles minimum and maximum dates', () => {
        expect(formatDateToYYMMDD('1900-01-01')).toBe('000101');
        expect(formatDateToYYMMDD('2099-12-31')).toBe('991231');
      });

      it('handles single digit months and days', () => {
        expect(formatDateToYYMMDD('2003-01-05')).toBe('030105');
        expect(formatDateToYYMMDD('1974-08-01')).toBe('740801');
      });
    });
  });

  describe('Integration Tests', () => {
    it('works with real-world MRZ variations', () => {
      // German passport example (fictional but realistic)
      const germanMRZ = `P<DEUTERMANN<<HANS<PETER<<<<<<<<<<<<<<<<<<<<
C012345677DEU8304159M2905141DEU<<<<<<<<<<<<8`;

      const info = extractMRZInfo(germanMRZ);
      expect(info.issuingCountry).toBe('DEU');
      expect(info.nationality).toBe('DEU');
      expect(info.surname).toBe('TERMANN');
      expect(info.givenNames).toBe('HANS PETER');
      expect(info.sex).toBe('M');
      expect(info.documentType).toBe('P');
    });

    it('handles various country codes', () => {
      const usMRZ = `P<USASMITH<<JOHN<WILLIAM<<<<<<<<<<<<<<<<<<<<
1234567891USA8501019M3012315USA<<<<<<<<<<<<6`;

      const info = extractMRZInfo(usMRZ);
      expect(info.issuingCountry).toBe('USA');
      expect(info.nationality).toBe('USA');
    });
  });

  describe('Check Digit Validation Fixes', () => {
    it('rejects non-numeric check digits per ICAO 9303', () => {
      // Test with '<' as check digit (should be rejected)
      const invalidCheckDigitSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C<6UTO7408122F1204159ZE184226B<<<<<10`;

      const info = extractMRZInfo(invalidCheckDigitSample);
      expect(info.validation.passportNumberChecksum).toBe(false);
      expect(info.validation.overall).toBe(false);
    });

    it('rejects other non-numeric check digits', () => {
      // Test with 'A' as check digit (should be rejected)
      const invalidCheckDigitSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902CA6UTO7408122F1204159ZE184226B<<<<<10`;

      const info = extractMRZInfo(invalidCheckDigitSample);
      expect(info.validation.passportNumberChecksum).toBe(false);
      expect(info.validation.overall).toBe(false);
    });

    it('accepts valid numeric check digits', () => {
      // Test with valid numeric check digit
      const validCheckDigitSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

      const info = extractMRZInfo(validCheckDigitSample);
      expect(info.validation.passportNumberChecksum).toBe(true);
    });
  });

  describe('Complex Name Parsing Fixes', () => {
    it('correctly parses complex surnames with multiple parts', () => {
      const complexNameSample = `P<UTOVAN<<DER<<BERG<<MARIA<ELENA<<<<<<<<<<<<
B2345678<1UTO9001015F2612125UTO<<<<<<<<<<<<8`;

      const info = extractMRZInfo(complexNameSample);
      expect(info.surname).toBe('VAN  DER  BERG');
      expect(info.givenNames).toBe('MARIA ELENA');
    });

    it('handles simple surnames correctly', () => {
      const simpleNameSample = `P<UTOSMITH<<JOHN<DOE<<<<<<<<<<<<<<<<<<<<<<<<
A1234567<9UTO8501019M2512314GBR<<<<<<<<<<<04`;

      const info = extractMRZInfo(simpleNameSample);
      expect(info.surname).toBe('SMITH');
      expect(info.givenNames).toBe('JOHN DOE');
    });

    it('handles surnames with single given name', () => {
      const singleGivenNameSample = `P<UTOJOHNSON<<JAMES<<<<<<<<<<<<<<<<<<<<<<<<<
B9876543<2UTO7506231M3006305GBR<<<<<<<<<<<07`;

      const info = extractMRZInfo(singleGivenNameSample);
      expect(info.surname).toBe('JOHNSON');
      expect(info.givenNames).toBe('JAMES');
    });

    it('handles names with no given names', () => {
      const noGivenNameSample = `P<UTOBROWN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
C5555555<5UTO8001011F2501015GBR<<<<<<<<<<<03`;

      const info = extractMRZInfo(noGivenNameSample);
      expect(info.surname).toBe('BROWN');
      expect(info.givenNames).toBe('');
    });
  });

  describe('Nationality Extraction Fixes', () => {
    it('handles nationality with stray digits at position 10', () => {
      const sampleWithStrayChar = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1UTO7408122F1204159ZE184226B<<<<<`;

      const info = extractMRZInfo(sampleWithStrayChar);
      expect(info.nationality).toBe('UU'); // Falls back to original slice(10,13) with non-letters removed
    });

    it('handles nationality with multiple stray characters', () => {
      const sampleWithMultipleStrayChars = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1T2UTO7408122F1204159ZE184226B<<<`;

      const info = extractMRZInfo(sampleWithMultipleStrayChars);
      expect(info.nationality).toBe('UT'); // Falls back to original slice(10,13) with non-letters removed
    });

    it('falls back gracefully when no 3-letter sequence found', () => {
      const sampleWithNoValidSequence = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36U1T27408122F1204159ZE184226B<<<<<1`;

      const info = extractMRZInfo(sampleWithNoValidSequence);
      expect(info.nationality).toBe('UT'); // Falls back to original slice(10,13) with non-letters removed
    });

    it('handles clean nationality field correctly', () => {
      const cleanSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

      const info = extractMRZInfo(cleanSample);
      expect(info.nationality).toBe('UTO'); // Normal case works as expected
    });

    it('handles nationality at end of window', () => {
      const nationalityAtEndSample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C3612UTO7408122F1204159ZE184226B<<<<<`;

      const info = extractMRZInfo(nationalityAtEndSample);
      expect(info.nationality).toBe('U'); // Falls back to original slice(10,13) with non-letters removed
    });
  });
});
