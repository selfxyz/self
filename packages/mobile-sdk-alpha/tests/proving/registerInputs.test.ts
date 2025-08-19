import { describe, expect, it, vi } from 'vitest';

import type { PassportData } from '@selfxyz/common/types';

import { registerInputs } from '../../src/proving/registerInputs';

vi.mock('@selfxyz/common/utils', () => ({
  generateCircuitInputsRegister: vi.fn(() => ({ a: 1 })),
  getCircuitNameFromPassportData: vi.fn(() => 'register_circuit'),
}));

const passportData: PassportData = {
  mrz: '',
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
  documentType: 'passport',
  documentCategory: 'passport',
  mock: true,
};

describe('registerInputs', () => {
  it('returns inputs and metadata for prod env', () => {
    const result = registerInputs('secret', passportData, 'tree', 'prod');
    expect(result).toEqual({
      inputs: { a: 1 },
      circuitName: 'register_circuit',
      endpointType: 'celo',
      endpoint: 'https://self.xyz',
    });
  });

  it('uses staging endpoint type when env is stg', () => {
    const result = registerInputs('secret', passportData, 'tree', 'stg');
    expect(result.endpointType).toBe('staging_celo');
  });
});
