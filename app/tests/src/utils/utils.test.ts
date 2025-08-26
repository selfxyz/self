import { checkScannedInfo } from '@/utils/utils';

describe('checkScannedInfo', () => {
  it('returns true for valid field lengths', () => {
    expect(checkScannedInfo('123456789', '900101', '251231')).toBe(true);
  });

  it('returns false when passport number is too long', () => {
    expect(checkScannedInfo('1234567890', '900101', '251231')).toBe(false);
  });

  it('returns false when date of birth length is invalid', () => {
    expect(checkScannedInfo('123456789', '90010', '251231')).toBe(false);
  });

  it('returns false when date of expiry length is invalid', () => {
    expect(checkScannedInfo('123456789', '900101', '25123')).toBe(false);
  });
});

