// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PassportData } from '@selfxyz/common/types';
import { useProvingStore } from '@/utils/proving/provingMachine';
import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

jest.mock('@selfxyz/common/utils/proving', () => ({
  getPayload: jest.fn(() => ({ inputs: { mocked: true }, circuitName: 'vc_and_disclose', endpointType: 'https', endpoint: 'https://dis' })),
  encryptAES256GCM: jest.fn(() => ({ nonce: [0], cipher_text: [1], auth_tag: [2] })),
}));

jest.mock('@selfxyz/common/utils/circuits/registerInputs', () => ({
  generateTEEInputsDiscloseStateless: jest.fn(() => ({
    inputs: { s: 1 },
    circuitName: 'vc_and_disclose',
    endpointType: 'https',
    endpoint: 'https://dis',
  })),
  generateTEEInputsRegister: jest.fn(),
  generateTEEInputsDSC: jest.fn(),
}));

const mockPassportData: PassportData = {
  mrz: 'mrz',
  dsc: 'dsc',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
  passportMetadata: { countryCode: 'UTO' } as any,
  documentCategory: 'passport',
  dsc_parsed: { authorityKeyIdentifier: 'abc' } as any,
} as any;

describe('disclosure flow integration', () => {
  it('uses preloaded trees for disclosure', async () => {
    useProtocolStore.setState(s => ({
      ...s,
      passport: {
        ...s.passport,
        ofac_trees: {
          nameAndDob: { root: ['dob'] },
          nameAndYob: { root: ['yob'] },
          passportNoAndNationality: { root: ['pp'] },
        } as any,
        commitment_tree: [[]] as any,
      },
    }));

    useProvingStore.setState({
      circuitType: 'disclose',
      env: 'prod',
      secret: '0x' + '00'.repeat(30) + 'a4ec',
      passportData: mockPassportData,
      sharedKey: 'test-key',
      uuid: 'test-uuid',
    } as any);

    const result = await useProvingStore.getState()._generatePayload({
      trackEvent: jest.fn(),
    } as any);

    expect(result).toBeTruthy();
    expect(result.inputs).toBeDefined();
  });

  it('triggers on-demand fetch when trees missing', async () => {
    useProtocolStore.setState(s => ({
      ...s,
      passport: { ...s.passport, ofac_trees: null, commitment_tree: null },
    }));

    useProvingStore.setState({
      circuitType: 'disclose',
      env: 'prod',
      secret: '0x' + '00'.repeat(30) + 'a4ec',
      passportData: mockPassportData,
      sharedKey: 'test-key',
      uuid: 'test-uuid',
    } as any);

    const fetchAll = jest
      .spyOn(useProtocolStore.getState().passport, 'fetch_all')
      .mockImplementation(async () => {
        useProtocolStore.setState(s => ({
          ...s,
          passport: {
            ...s.passport,
            ofac_trees: {
              nameAndDob: {},
              nameAndYob: {},
              passportNoAndNationality: {},
            } as any,
            commitment_tree: [[]] as any,
          },
        }));
      });

    await useProvingStore.getState()._generatePayload({
      trackEvent: jest.fn(),
    } as any);

    expect(fetchAll).toHaveBeenCalled();
  });
});
