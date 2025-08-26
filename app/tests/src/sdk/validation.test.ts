import { isPassportDataValid } from '@selfxyz/mobile-sdk-alpha';
import { genAndInitMockPassportData } from '@selfxyz/common/utils/passports/genMockPassportData';

describe('mobile-sdk validation', () => {
  it('returns true for valid passport data', () => {
    const passport = genAndInitMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha256_65537_4096',
      'USA',
      '900101',
      '400101',
    );
    expect(isPassportDataValid(passport)).toBe(true);
  });

  it('returns false for invalid passport data', () => {
    const passport = genAndInitMockPassportData(
      'sha256',
      'sha256',
      'rsa_sha256_65537_4096',
      'USA',
      '900101',
      '400101',
    );

    expect(
      isPassportDataValid({ ...passport, passportMetadata: undefined } as any),
    ).toBe(false);
  });
});

