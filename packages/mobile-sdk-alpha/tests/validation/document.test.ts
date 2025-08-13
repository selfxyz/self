import { describe, expect, it } from 'vitest';

import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';

import { isPassportDataValid } from '../../src/validation/document';

const basePassport = genAndInitMockPassportData('sha256', 'sha256', 'rsa_sha256_65537_4096', 'FRA', '940131', '401031');

describe('isPassportDataValid', () => {
  it('returns true for valid data', () => {
    expect(isPassportDataValid(basePassport)).toBe(true);
  });

  it('returns false when metadata missing', () => {
    const noMeta = { ...basePassport, passportMetadata: undefined } as any;
    expect(isPassportDataValid(noMeta)).toBe(false);
  });

  it('returns false when dg1 hash mismatches', () => {
    const tampered = { ...basePassport, dg1Hash: [...(basePassport.dg1Hash || [])] };
    if (tampered.dg1Hash.length > 0) {
      tampered.dg1Hash[0] ^= 0xff;
    }
    expect(isPassportDataValid(tampered)).toBe(false);
  });
});
