import { describe, expect, it } from 'vitest';

import type { SelfAppDisclosureConfig } from '../src/utils/appType.js';
import {
  getSelectorDg1IdCard,
  getSelectorDg1Passport,
} from '../src/utils/circuits/registerInputs.js';

describe('getSelectorDg1Passport - first_name and last_name handling', () => {
  it('should not crash when first_name is included in disclosures', () => {
    const disclosures: SelfAppDisclosureConfig = {
      first_name: true,
      last_name: false,
      date_of_birth: true,
    };

    const result = getSelectorDg1Passport(disclosures);

    expect(result).toBeDefined();
    expect(result).toHaveLength(88);

    expect(result.slice(0, 57).every((v) => v === '0')).toBe(true);
    expect(result.slice(57, 63).every((v) => v === '1')).toBe(true);
    expect(result.slice(63).every((v) => v === '0')).toBe(true);
  });
});

describe('getSelectorDg1IdCard - first_name and last_name handling', () => {
  it('should not crash when first_name is included in disclosures', () => {
    const disclosures: SelfAppDisclosureConfig = {
      first_name: true,
      last_name: false,
      date_of_birth: true,
    };

    const result = getSelectorDg1IdCard(disclosures);

    expect(result).toBeDefined();
    expect(result).toHaveLength(90);

    expect(result.slice(0, 30).every((v) => v === '0')).toBe(true);
    expect(result.slice(30, 36).every((v) => v === '1')).toBe(true);
    expect(result.slice(36, 90).every((v) => v === '0')).toBe(true);
  });
});
