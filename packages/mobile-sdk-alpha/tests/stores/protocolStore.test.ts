// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProtocolStore } from '../../src/stores/protocolStore';

const originalFetch = global.fetch;

describe('protocolStore.fetch_ofac_trees', () => {
  beforeEach(() => {
    useProtocolStore.setState(state => ({
      passport: { ...state.passport, ofac_trees: null },
    }));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('stores OFAC trees when responses are raw payloads', async () => {
    const responses: Record<string, any> = {
      'passport-no-nationality': { root: ['pp'] },
      'name-dob': { root: ['dob'] },
      'name-yob': { root: ['yob'] },
    };

    vi.spyOn(global, 'fetch').mockImplementation((input: string | Request | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const key = url.includes('passport-no-nationality')
        ? 'passport-no-nationality'
        : url.includes('name-dob')
          ? 'name-dob'
          : 'name-yob';
      return Promise.resolve({ ok: true, json: async () => responses[key] } as Response);
    });

    await useProtocolStore.getState().passport.fetch_ofac_trees('prod');
    expect(useProtocolStore.getState().passport.ofac_trees).toEqual({
      passportNoAndNationality: responses['passport-no-nationality'],
      nameAndDob: responses['name-dob'],
      nameAndYob: responses['name-yob'],
    });
  });

  it('stores OFAC trees when responses are wrapped payloads', async () => {
    const responses: Record<string, any> = {
      'passport-no-nationality': { status: 'success', data: { root: ['pp'] } },
      'name-dob': { status: 'success', data: { root: ['dob'] } },
      'name-yob': { status: 'success', data: { root: ['yob'] } },
    };

    vi.spyOn(global, 'fetch').mockImplementation((input: string | Request | URL, _init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const key = url.includes('passport-no-nationality')
        ? 'passport-no-nationality'
        : url.includes('name-dob')
          ? 'name-dob'
          : 'name-yob';
      return Promise.resolve({ ok: true, json: async () => responses[key] } as Response);
    });

    await useProtocolStore.getState().passport.fetch_ofac_trees('prod');
    expect(useProtocolStore.getState().passport.ofac_trees).toEqual({
      passportNoAndNationality: responses['passport-no-nationality'].data,
      nameAndDob: responses['name-dob'].data,
      nameAndYob: responses['name-yob'].data,
    });
  });
});
