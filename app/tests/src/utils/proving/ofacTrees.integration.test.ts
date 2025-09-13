// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

describe('OFAC trees integration', () => {
  beforeEach(() => {
    useProtocolStore.setState(s => ({
      ...s,
      passport: { ...s.passport, ofac_trees: null },
    }));
  });

  it('loads OFAC trees via fetch_ofac_trees', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ root: ['pp-test'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ status: 'success', data: { root: ['dob-test'] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ root: ['yob-test'] }),
      });

    await useProtocolStore.getState().passport.fetch_ofac_trees('prod');
    const trees = useProtocolStore.getState().passport.ofac_trees;
    expect(trees).toEqual({
      passportNoAndNationality: { root: ['pp-test'] },
      nameAndDob: { root: ['dob-test'] },
      nameAndYob: { root: ['yob-test'] },
    });
  });

  it('handles both raw and wrapped response formats', async () => {
    const mockResponses = [
      { root: ['raw'] },
      { status: 'success', data: { root: ['wrapped'] } },
      { root: ['raw2'] },
    ];

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponses.shift()),
      }),
    );

    await useProtocolStore.getState().passport.fetch_ofac_trees('prod');
    const trees = useProtocolStore.getState().passport.ofac_trees;
    expect(trees.passportNoAndNationality).toEqual({ root: ['raw'] });
    expect(trees.nameAndDob).toEqual({ root: ['wrapped'] });
    expect(trees.nameAndYob).toEqual({ root: ['raw2'] });
  });
});
