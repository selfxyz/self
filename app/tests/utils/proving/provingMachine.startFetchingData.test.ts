// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

import { useProvingStore } from '@/utils/proving/provingMachine';

import { actorMock } from './actorMock';

jest.mock('xstate', () => {
  const { actorMock: mockActor } = require('./actorMock');
  return {
    createActor: jest.fn(() => mockActor),
    createMachine: jest.fn(),
    assign: jest.fn(),
    send: jest.fn(),
    spawn: jest.fn(),
    interpret: jest.fn(),
    fromPromise: jest.fn(),
    fromObservable: jest.fn(),
    fromEventObservable: jest.fn(),
    fromCallback: jest.fn(),
    fromTransition: jest.fn(),
    fromReducer: jest.fn(),
    fromRef: jest.fn(),
  };
});

jest.mock('@/utils/analytics', () => () => ({
  trackEvent: jest.fn(),
}));
jest.mock('@/providers/passportDataProvider', () => ({
  loadSelectedDocument: jest.fn(),
  unsafe_getPrivateKey: jest.fn(),
}));
jest.mock('@/providers/authProvider', () => ({
  unsafe_getPrivateKey: jest.fn(),
}));

// app/tests/utils/proving/provingMachine.startFetchingData.test.ts

jest.mock('@selfxyz/mobile-sdk-alpha', () => {
  const actual = jest.requireActual('@selfxyz/mobile-sdk-alpha');
  return {
    __esModule: true,
    ...actual,
    loadSelectedDocument: jest.fn().mockResolvedValue({
      data: {
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' },
      },
    }),
  };
});

describe('startFetchingData', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const {
      loadSelectedDocument,
    } = require('@/providers/passportDataProvider');
    loadSelectedDocument.mockResolvedValue({
      data: {
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' },
      },
    });
    const { unsafe_getPrivateKey } = require('@/providers/authProvider');
    unsafe_getPrivateKey.mockResolvedValue('secret');

    // Create mock selfClient
    const mockSelfClient = {
      getPrivateKey: jest.fn().mockResolvedValue('mock-secret'),
    } as unknown as SelfClient;

    useProtocolStore.setState({
      passport: { fetch_all: jest.fn().mockResolvedValue(undefined) },
    } as any);
    await useProvingStore.getState().init(mockSelfClient, 'register');
    actorMock.send.mockClear();
    useProtocolStore.setState({
      passport: { fetch_all: jest.fn() },
    } as any);
    useProvingStore.setState({
      // @ts-expect-error
      passportData: { documentCategory: 'passport', mock: false },
      env: 'prod',
    });
  });

  it('emits FETCH_ERROR when dsc_parsed is missing', async () => {
    await useProvingStore.getState().startFetchingData();

    expect(
      useProtocolStore.getState().passport.fetch_all,
    ).not.toHaveBeenCalled();
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
  });
});
