import { describe, expect, it } from 'vitest';

import type { SelfAppDisclosureConfig } from '../src/utils/appType.js';

describe('SelfAppDisclosureConfig', () => {
  it('should accept first_name and last_name flags without error', () => {
    const config: SelfAppDisclosureConfig = {
      first_name: true,
      last_name: true,
    };

    expect(config.first_name).toBe(true);
    expect(config.last_name).toBe(true);
  });

  it('should accept first_name and last_name as false', () => {
    const config: SelfAppDisclosureConfig = {
      first_name: false,
      last_name: false,
    };

    expect(config.first_name).toBe(false);
    expect(config.last_name).toBe(false);
  });

  it('should accept first_name and last_name as optional fields', () => {
    const config: SelfAppDisclosureConfig = {
      name: true,
    };

    expect(config.first_name).toBeUndefined();
    expect(config.last_name).toBeUndefined();
  });

  it('should accept first_name and last_name along with other disclosure fields', () => {
    const config: SelfAppDisclosureConfig = {
      first_name: true,
      last_name: true,
      date_of_birth: true,
      nationality: true,
      passport_number: true,
    };

    expect(config.first_name).toBe(true);
    expect(config.last_name).toBe(true);
    expect(config.date_of_birth).toBe(true);
    expect(config.nationality).toBe(true);
    expect(config.passport_number).toBe(true);
  });
});
