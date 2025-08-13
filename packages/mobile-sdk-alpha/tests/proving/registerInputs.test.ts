import { describe, expect, it, vi } from 'vitest';

import type { PassportData } from '@selfxyz/common/types';
import { generateCircuitInputsRegister, getCircuitNameFromPassportData } from '@selfxyz/common/utils';

import { generateTEEInputsRegister } from '../../src';

vi.mock('@selfxyz/common/utils', () => ({
  generateCircuitInputsRegister: vi.fn(() => ({ mocked: true })),
  getCircuitNameFromPassportData: vi.fn(() => 'reg'),
}));

describe('generateTEEInputsRegister', () => {
  it('builds register inputs with endpoint info', () => {
    const passportData = { documentCategory: 'passport' } as PassportData;
    const result = generateTEEInputsRegister('sec', passportData, 'tree', 'stg');
    expect(generateCircuitInputsRegister).toHaveBeenCalledWith('sec', passportData, 'tree');
    expect(getCircuitNameFromPassportData).toHaveBeenCalledWith(passportData, 'register');
    expect(result).toEqual({
      inputs: { mocked: true },
      circuitName: 'reg',
      endpointType: 'staging_celo',
      endpoint: 'https://self.xyz',
    });
  });
});
