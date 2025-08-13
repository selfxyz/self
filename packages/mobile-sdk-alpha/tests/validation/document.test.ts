import { describe, expect, it } from 'vitest';

import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';

import { isPassportDataValid, type PassportValidationError } from '../../src/validation/document';

const basePassport = genAndInitMockPassportData('sha256', 'sha256', 'rsa_sha256_65537_4096', 'FRA', '940131', '401031');

describe('isPassportDataValid', () => {
  it('returns true for valid data', () => {
    expect(isPassportDataValid(basePassport)).toBe(true);
  });

  it('calls onInvalid when metadata missing', () => {
    const noMeta = { ...basePassport, passportMetadata: undefined } as any;
    const errors: PassportValidationError[] = [];
    expect(isPassportDataValid(noMeta, { onInvalid: e => errors.push(e) })).toBe(false);
    expect(errors).toEqual(['passport_metadata_null']);
  });

  it('calls onInvalid when dg1 hash mismatches', () => {
    const tampered = { ...basePassport, dg1Hash: [...(basePassport.dg1Hash || [])] };
    if (tampered.dg1Hash.length > 0) {
      tampered.dg1Hash[0] ^= 0xff;
    }
    let error: PassportValidationError | undefined;
    expect(isPassportDataValid(tampered, { onInvalid: e => (error = e) })).toBe(false);
    expect(error).toBe('dg1_hash_mismatch');
  });
});
