// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, renderHook } from '@testing-library/react-native';

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useProvingStore } from '@/utils/proving/provingMachine';

jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => {
  return {
    loadSelectedDocument: jest.fn().mockResolvedValue(null),
  };
});

describe('provingMachine registration completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes proving machine for confirmed registration - no document found', async () => {
    const { result: initHook } = renderHook(() =>
      useProvingStore(state => state.init),
    );
    const selfClient = {} as SelfClient;

    expect(initHook.current).toBeDefined();

    await act(async () => {
      await initHook.current(selfClient, 'register');
    });

    const { result: provingStoreHook } = renderHook(() =>
      useProvingStore(state => state.currentState),
    );

    expect(provingStoreHook.current).toBe('passport_data_not_found');
  });
});
