// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

import { useProvingStore } from '@/utils/proving/provingMachine';

describe('disclosure flow integration', () => {
  const mockPassportData: any = {
    documentCategory: 'passport',
    passportMetadata: {},
  };

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
      environment: 'prod',
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

    const mockFetchAll = jest
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

    useProvingStore.setState({ circuitType: 'disclose' } as any);

    await useProvingStore.getState()._generatePayload({
      trackEvent: jest.fn(),
    } as any);

    expect(mockFetchAll).toHaveBeenCalled();
  });
});
