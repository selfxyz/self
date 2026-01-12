// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '../../../src';
import * as documentUtils from '../../../src/documents/utils';
import { useProvingStore } from '../../../src/proving/provingMachine';
import { useProtocolStore } from '../../../src/stores/protocolStore';
import { actorMock, emitState } from '../actorMock';

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

vitest.mock('@selfxyz/common/utils', async () => {
  const actual = await vitest.importActual<typeof import('@selfxyz/common/utils')>('@selfxyz/common/utils');
  return {
    ...actual,
    getCircuitNameFromPassportData: vitest.fn(() => 'mock-circuit'),
  };
});

describe('websocket URL resolution (refactor guardrail via initTeeConnection)', () => {
  const wsSend = vitest.fn();
  const wsAddEventListener = vitest.fn();
  const wsMock = vitest.fn(() => ({
    addEventListener: wsAddEventListener,
    send: wsSend,
  }));
  let loadSelectedDocumentSpy: any;

  const makeSelfClient = (): SelfClient =>
    ({
      getPrivateKey: vitest.fn().mockResolvedValue('secret'),
      trackEvent: vitest.fn(),
      logProofEvent: vitest.fn(),
      getProvingState: () => useProvingStore.getState(),
      getProtocolState: () => useProtocolStore.getState(),
      getSelfAppState: () => ({ selfApp: null }),
    }) as unknown as SelfClient;

  const setCircuitsMapping = (documentCategory: 'passport' | 'id_card' | 'aadhaar', mapping: any) => {
    useProtocolStore.setState(state => ({
      [documentCategory]: {
        ...state[documentCategory],
        circuits_dns_mapping: mapping,
      },
    }));
  };

  beforeEach(() => {
    vitest.restoreAllMocks();
    vitest.clearAllMocks();
    global.WebSocket = wsMock as unknown as typeof WebSocket;
    loadSelectedDocumentSpy = vitest.spyOn(documentUtils, 'loadSelectedDocument');
  });

  it.each([
    {
      label: 'disclose passport -> DISCLOSE',
      circuitType: 'disclose' as const,
      documentCategory: 'passport' as const,
      circuitName: 'disclose',
      mappingKey: 'DISCLOSE',
    },
    {
      label: 'disclose id_card -> DISCLOSE_ID',
      circuitType: 'disclose' as const,
      documentCategory: 'id_card' as const,
      circuitName: 'disclose',
      mappingKey: 'DISCLOSE_ID',
    },
    {
      label: 'disclose aadhaar -> DISCLOSE_AADHAAR',
      circuitType: 'disclose' as const,
      documentCategory: 'aadhaar' as const,
      circuitName: 'disclose_aadhaar',
      mappingKey: 'DISCLOSE_AADHAAR',
    },
    {
      label: 'register passport -> REGISTER',
      circuitType: 'register' as const,
      documentCategory: 'passport' as const,
      circuitName: 'mock-circuit',
      mappingKey: 'REGISTER',
    },
    {
      label: 'register id_card -> REGISTER_ID',
      circuitType: 'register' as const,
      documentCategory: 'id_card' as const,
      circuitName: 'mock-circuit',
      mappingKey: 'REGISTER_ID',
    },
    {
      label: 'register aadhaar -> REGISTER_AADHAAR',
      circuitType: 'register' as const,
      documentCategory: 'aadhaar' as const,
      circuitName: 'mock-circuit',
      mappingKey: 'REGISTER_AADHAAR',
    },
    {
      label: 'dsc passport -> DSC',
      circuitType: 'dsc' as const,
      documentCategory: 'passport' as const,
      circuitName: 'mock-circuit',
      mappingKey: 'DSC',
    },
    {
      label: 'dsc id_card -> DSC_ID',
      circuitType: 'dsc' as const,
      documentCategory: 'id_card' as const,
      circuitName: 'mock-circuit',
      mappingKey: 'DSC_ID',
    },
  ])('$label resolves expected WebSocket URL', async ({ circuitType, documentCategory, circuitName, mappingKey }) => {
    const selfClient = makeSelfClient();
    const wsUrl = `wss://example/${mappingKey}`;

    loadSelectedDocumentSpy.mockResolvedValue({
      data: {
        documentCategory,
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'aki' },
      } as any,
    } as any);

    setCircuitsMapping(documentCategory, {
      [mappingKey]: {
        [circuitName]: wsUrl,
      },
    });

    await useProvingStore.getState().init(selfClient, circuitType);

    const initPromise = useProvingStore.getState().initTeeConnection(selfClient);
    emitState('ready_to_prove');
    await initPromise;

    expect(wsMock).toHaveBeenCalledWith(wsUrl);
  });

  it('throws when mapping is missing for the circuit', async () => {
    const selfClient = makeSelfClient();

    loadSelectedDocumentSpy.mockResolvedValue({
      data: {
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'aki' },
      } as any,
    } as any);

    setCircuitsMapping('passport', {
      REGISTER: {
        other: 'wss://missing',
      },
    });

    await useProvingStore.getState().init(selfClient, 'register');

    await expect(useProvingStore.getState().initTeeConnection(selfClient)).rejects.toThrow(
      'No WebSocket URL available for TEE connection',
    );
  });

  it('throws for unsupported document categories', async () => {
    const selfClient = makeSelfClient();
    const invalidCategory = 'driver_license';

    loadSelectedDocumentSpy.mockResolvedValue({
      data: {
        documentCategory: invalidCategory,
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'aki' },
      } as any,
    } as any);

    useProtocolStore.setState(state => ({
      ...(state as any),
      [invalidCategory]: {
        circuits_dns_mapping: {},
      },
    }));

    await useProvingStore.getState().init(selfClient, 'disclose');

    await expect(useProvingStore.getState().initTeeConnection(selfClient)).rejects.toThrow(
      'Unsupported document category for disclose: driver_license',
    );
  });
});
