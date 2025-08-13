import { describe, expect, it, vi } from 'vitest';

import type { PassportData } from '@selfxyz/common/types';
import type { SelfApp } from '@selfxyz/common/utils';
import { generateCircuitInputsVCandDisclose } from '@selfxyz/common/utils';

import { generateTEEInputsDisclose } from '../../src';

vi.mock('@selfxyz/common/utils', () => ({
  calculateUserIdentifierHash: vi.fn(() => BigInt(1)),
  hashEndpointWithScope: vi.fn(() => 'scope_hash'),
  generateCircuitInputsVCandDisclose: vi.fn(() => ({ mocked: true })),
}));

vi.mock('@openpassport/zk-kit-lean-imt', () => ({
  LeanIMT: { import: vi.fn(() => 'tree') },
}));

vi.mock('@openpassport/zk-kit-smt', () => {
  const SMT = vi.fn().mockImplementation(() => ({ import: vi.fn() }));
  return { SMT };
});

vi.mock('poseidon-lite', () => ({ poseidon2: vi.fn() }));

describe('generateTEEInputsDisclose', () => {
  it('builds disclose inputs with endpoint info', () => {
    const passportData = { documentCategory: 'passport' } as PassportData;
      const selfApp = {
        scope: 's',
        disclosures: {},
        endpoint: 'https://e',
        endpointType: 'https',
        userId: 'u',
        userDefinedData: '0x0',
        chainID: 1,
      } as any;
    const ofacTrees = {
      passportNoAndNationality: [],
      nameAndDob: [],
      nameAndYob: [],
    } as any;
    const commitmentTree = [['0']];
      const result = generateTEEInputsDisclose('sec', passportData, selfApp as SelfApp, ofacTrees, commitmentTree as any);
    expect(generateCircuitInputsVCandDisclose).toHaveBeenCalled();
    expect(result).toEqual({
      inputs: { mocked: true },
      circuitName: 'vc_and_disclose',
      endpointType: 'https',
      endpoint: 'https://e',
    });
  });
});
