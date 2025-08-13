import { describe, expect, it } from 'vitest';

import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';

import { isPassportDataValid } from '../../src/validation/document';

const basePassport = genAndInitMockPassportData('sha256', 'sha256', 'rsa_sha256_65537_4096', 'FRA', '940131', '401031');

describe('isPassportDataValid', () => {
  it('returns true for valid data', () => {
    expect(isPassportDataValid(basePassport)).toBe(true);
  });

  it('invokes onPassportMetadataNull when metadata missing', () => {
    const noMeta = { ...basePassport, passportMetadata: undefined } as any;
    let called = false;
    expect(
      isPassportDataValid(noMeta, {
        onPassportMetadataNull: () => (called = true),
      }),
    ).toBe(false);
    expect(called).toBe(true);
  });

  it('invokes onDg1HashMismatch when dg1 hash mismatches', () => {
    const tampered = { ...basePassport, dg1Hash: [...(basePassport.dg1Hash || [])] };
    if (tampered.dg1Hash.length > 0) {
      tampered.dg1Hash[0] ^= 0xff;
    }
    let called = false;
    expect(isPassportDataValid(tampered, { onDg1HashMismatch: () => (called = true) })).toBe(false);
    expect(called).toBe(true);
  });
});
