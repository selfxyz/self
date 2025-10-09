// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '../../src';
import { ProofEvents } from '../../src/constants/analytics';
import * as documentUtils from '../../src/documents/utils';
import { useProvingStore } from '../../src/proving/provingMachine';
import { useProtocolStore } from '../../src/stores/protocolStore';
import { useSelfAppStore } from '../../src/stores/selfAppStore';
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

vitest.mock('../../src/stores', async () => {
  const actual = await vitest.importActual<typeof import('../../src/stores')>('../../src/stores');
  return {
    ...actual,
    fetchAllTreesAndCircuits: vitest.fn(),
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
      getSelfAppState: () => useSelfAppStore.getState(),
      getProvingState: () => useProvingStore.getState(),
      getProtocolState: () => useProtocolStore.getState(),
    } as unknown as SelfClient;

    await useProvingStore.getState().init(mockSelfClient, 'register');
    actorMock.send.mockClear();

    useProvingStore.setState({
      passportData: { documentCategory: 'passport', mock: false },
      env: 'prod',
    } as any);
  });

  it('emits FETCH_ERROR when dsc_parsed is missing', async () => {
    await useProvingStore.getState().startFetchingData(mockSelfClient);
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_STARTED);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'Missing parsed DSC in passport data',
    });
  });
});
