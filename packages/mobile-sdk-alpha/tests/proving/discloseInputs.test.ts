import { describe, expect, it, vi } from 'vitest';

import { attributeToPosition } from '@selfxyz/common/constants';
import type { PassportData } from '@selfxyz/common/types';
import { generateCircuitInputsVCandDisclose } from '@selfxyz/common/utils';

import type { DiscloseSelfApp, OfacTrees } from '../../src/proving/discloseInputs';
import { discloseInputs } from '../../src/proving/discloseInputs';

vi.mock('@selfxyz/common/utils', () => ({
  calculateUserIdentifierHash: vi.fn(() => 123n),
  generateCircuitInputsVCandDisclose: vi.fn(() => ({ b: 2 })),
  hashEndpointWithScope: vi.fn(() => 'scope_hash'),
}));

vi.mock('@openpassport/zk-kit-lean-imt', () => ({
  LeanIMT: { import: vi.fn(() => 'tree') },
}));

vi.mock('@openpassport/zk-kit-smt', () => ({
  SMT: vi.fn().mockImplementation(() => ({ import: vi.fn() })),
}));

vi.mock('poseidon-lite', () => ({ poseidon2: vi.fn(() => 'hash') }));

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
const selfApp: DiscloseSelfApp = {
  scope: 'scope',
  disclosures: { name: true, ofac: true, minimumAge: 21 },
  userId: 'user',
  userDefinedData: 'data',
  chainID: 42220,
};
const ofacTrees: OfacTrees = {
  passportNoAndNationality: 'pn',
  nameAndDob: 'nd',
  nameAndYob: 'ny',
};
const commitmentTree = 'treeData';

describe('discloseInputs', () => {
  it('returns inputs and metadata and builds selectors', () => {
    const result = discloseInputs('secret', passportData, selfApp, ofacTrees, commitmentTree, 'prod');
    expect(result).toEqual({
      inputs: { b: 2 },
      circuitName: 'vc_and_disclose',
      endpointType: 'celo',
      endpoint: 'https://self.xyz',
    });
    const callArgs = vi.mocked(generateCircuitInputsVCandDisclose).mock.calls[0];
    const selector_dg1 = callArgs[4];
    const selector_older_than = callArgs[5];
    const selector_ofac = callArgs[11];
    const expectedSelector = Array(88).fill('0');
    const [start, end] = attributeToPosition.name;
    expectedSelector.fill('1', start, end + 1);
    expect(selector_dg1).toEqual(expectedSelector);
    expect(selector_older_than).toBe('1');
    expect(selector_ofac).toBe(1);
  });
});
