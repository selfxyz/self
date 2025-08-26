import { normalizeBorderWidth } from '@/utils/styleUtils';

describe('normalizeBorderWidth', () => {
  it('returns the number for non-negative numbers', () => {
    expect(normalizeBorderWidth(0)).toBe(0);
    expect(normalizeBorderWidth(2)).toBe(2);
  });

  it('returns undefined for negative numbers or non-numeric values', () => {
    expect(normalizeBorderWidth(-1)).toBeUndefined();
    expect(normalizeBorderWidth('3' as any)).toBeUndefined();
    expect(normalizeBorderWidth(undefined)).toBeUndefined();
  });
});

