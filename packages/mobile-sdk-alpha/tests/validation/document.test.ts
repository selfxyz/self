import { describe, expect, it } from 'vitest';

import { hash } from '@selfxyz/common/utils/hash/sha';
import { formatMrz } from '@selfxyz/common/utils/passportFormat';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';

import { isPassportDataValid } from '../../src/validation/document';

const basePassport = genAndInitMockPassportData('sha256', 'sha256', 'rsa_sha256_65537_4096', 'FRA', '940131', '401031');
const baseWithHash = {
  ...basePassport,
  dg1Hash: hash('sha256', formatMrz(basePassport.mrz)) as number[],
};

describe('isPassportDataValid', () => {
  it('returns true for valid data', () => {
    expect(isPassportDataValid(basePassport)).toBe(true);
  });

  it('returns false when metadata missing', () => {
    const noMeta = { ...basePassport, passportMetadata: undefined } as any;
    expect(isPassportDataValid(noMeta)).toBe(false);
  });

  it('returns false when dg1HashFunction is missing', () => {
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: undefined },
    } as any;
    expect(isPassportDataValid(noHashFunc)).toBe(false);
  });

  it('returns false when eContentHashFunction is missing', () => {
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, eContentHashFunction: undefined },
    } as any;
    expect(isPassportDataValid(noHashFunc)).toBe(false);
  });

  it('returns false when signedAttrHashFunction is missing', () => {
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, signedAttrHashFunction: undefined },
    } as any;
    expect(isPassportDataValid(noHashFunc)).toBe(false);
  });

  it('returns false for unsupported hash algorithm', () => {
    const badAlgo = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: 'md5' },
    } as any;
    expect(isPassportDataValid(badAlgo)).toBe(false);
  });

  it('returns false when dg1 hash mismatches', () => {
    const tampered = { ...baseWithHash, dg1Hash: [...baseWithHash.dg1Hash] };
    tampered.dg1Hash[0] ^= 0xff;
    expect(isPassportDataValid(tampered)).toBe(false);
  });

  it('returns true when dg1Hash array is empty', () => {
    const emptyHash = { ...basePassport, dg1Hash: [] };
    expect(isPassportDataValid(emptyHash)).toBe(true);
  });

  it('handles null passport data', () => {
    expect(isPassportDataValid(null as any)).toBe(false);
  });

  it('handles undefined passport data', () => {
    expect(isPassportDataValid(undefined as any)).toBe(false);
  });

  it('returns false when MRZ string is empty', () => {
    const noMrz = { ...basePassport, mrz: '' } as any;
    expect(isPassportDataValid(noMrz)).toBe(false);
  });
});
