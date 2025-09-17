// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { SelfClient, useProtocolStore, useProvingStore } from '../../src';
import * as documentUtils from '../../src/documents/utils';
import { actorMock } from './actorMock';

vitest.mock('xstate', () => {
  return {
    createActor: vitest.fn(() => actorMock),
    createMachine: vitest.fn(),
    assign: vitest.fn(),
    send: vitest.fn(),
    spawn: vitest.fn(),
    interpret: vitest.fn(),
    fromPromise: vitest.fn(),
    fromObservable: vitest.fn(),
    fromEventObservable: vitest.fn(),
    fromCallback: vitest.fn(),
    fromTransition: vitest.fn(),
    fromReducer: vitest.fn(),
    fromRef: vitest.fn(),
  };
});

describe('startFetchingData', () => {
  let mockSelfClient: SelfClient;
  beforeEach(async () => {
    vitest.clearAllMocks();

    const loadSelectedDocumentSpy = vitest.spyOn(documentUtils, 'loadSelectedDocument');

    loadSelectedDocumentSpy.mockResolvedValue({
      data: {
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' } as any,
      },
    } as any);

    // Create mock selfClient
    mockSelfClient = {
      getPrivateKey: vitest.fn().mockResolvedValue('secret'), // or mock-secret?
      trackEvent: vitest.fn(),
      logProofEvent: vitest.fn(),
    } as unknown as SelfClient;

    useProtocolStore.setState({
      passport: { fetch_all: vitest.fn().mockResolvedValue(undefined) },
    } as any);
    await useProvingStore.getState().init(mockSelfClient, 'register');
    actorMock.send.mockClear();
    useProtocolStore.setState({
      passport: { fetch_all: vitest.fn() },
    } as any);
    useProvingStore.setState({
      passportData: { documentCategory: 'passport', mock: false },
      env: 'prod',
    } as any);
  });

  it('emits FETCH_ERROR when dsc_parsed is missing', async () => {
    await useProvingStore.getState().startFetchingData(mockSelfClient);

    expect(useProtocolStore.getState().passport.fetch_all).not.toHaveBeenCalled();
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
  });
});
