// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '../../src';
import { ProofEvents } from '../../src/constants/analytics';
import * as documentUtils from '../../src/documents/utils';
import { useProvingStore } from '../../src/proving/provingMachine';
import { fetchAllTreesAndCircuits } from '../../src/stores';
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

const createMockSelfClient = () =>
  ({
    getPrivateKey: vitest.fn().mockResolvedValue('secret'),
    trackEvent: vitest.fn(),
    logProofEvent: vitest.fn(),
    getSelfAppState: () => useSelfAppStore.getState(),
    getProvingState: () => useProvingStore.getState(),
    getProtocolState: () => useProtocolStore.getState(),
  }) as unknown as SelfClient;

function mockDocument(data: Record<string, unknown>) {
  vitest.spyOn(documentUtils, 'loadSelectedDocument').mockResolvedValue({ data } as any);
}

describe('init parsing decision', () => {
  beforeEach(() => {
    vitest.clearAllMocks();
    useProvingStore.setState({ circuitType: null, passportData: null, env: null });
  });

  describe('passport', () => {
    it('skips parsing for disclose when dsc_parsed has authorityKeyIdentifier', async () => {
      const client = createMockSelfClient();
      mockDocument({
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' },
      });

      await useProvingStore.getState().init(client, 'disclose');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(client.trackEvent).not.toHaveBeenCalledWith(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
    });

    it('parses for disclose when dsc_parsed is missing', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'passport', mock: false });

      await useProvingStore.getState().init(client, 'disclose');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(client.trackEvent).toHaveBeenCalledWith(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
    });

    it('parses when dsc_parsed exists but authorityKeyIdentifier is missing', async () => {
      const client = createMockSelfClient();
      mockDocument({
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { issuer: 'some-issuer' },
      });

      await useProvingStore.getState().init(client, 'disclose');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_DATA' });
    });

    it('skips parsing for register when dsc_parsed has authorityKeyIdentifier', async () => {
      const client = createMockSelfClient();
      mockDocument({
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' },
      });

      await useProvingStore.getState().init(client, 'register');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
    });

    it('parses for register when dsc_parsed is missing', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'passport', mock: false });

      await useProvingStore.getState().init(client, 'register');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_DATA' });
    });
  });

  describe('id_card', () => {
    it('skips parsing for disclose when dsc_parsed has authorityKeyIdentifier', async () => {
      const client = createMockSelfClient();
      mockDocument({
        documentCategory: 'id_card',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' },
      });

      await useProvingStore.getState().init(client, 'disclose');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
    });

    it('parses for register when dsc_parsed is missing', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'id_card', mock: false });

      await useProvingStore.getState().init(client, 'register');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_DATA' });
    });
  });

  describe('dsc circuit', () => {
    it('always parses even when dsc_parsed already exists', async () => {
      const client = createMockSelfClient();
      mockDocument({
        documentCategory: 'passport',
        mock: false,
        dsc_parsed: { authorityKeyIdentifier: 'key' },
      });

      await useProvingStore.getState().init(client, 'dsc');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(client.trackEvent).toHaveBeenCalledWith(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
    });

    it('parses when dsc_parsed is missing', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'passport', mock: false });

      await useProvingStore.getState().init(client, 'dsc');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_DATA' });
    });
  });

  describe('aadhaar', () => {
    it('skips parsing for disclose (does not require DSC)', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'aadhaar', mock: false });

      await useProvingStore.getState().init(client, 'disclose');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(client.trackEvent).not.toHaveBeenCalledWith(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
    });

    it('skips parsing for register (does not require DSC)', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'aadhaar', mock: false });

      await useProvingStore.getState().init(client, 'register');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
    });
  });

  describe('kyc', () => {
    it('skips parsing for disclose (does not require DSC)', async () => {
      const client = createMockSelfClient();
      mockDocument({ documentCategory: 'kyc', mock: false });

      await useProvingStore.getState().init(client, 'disclose');

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_DATA' });
      expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'PARSE_ID_DOCUMENT' });
      expect(client.trackEvent).not.toHaveBeenCalledWith(ProofEvents.PARSE_ID_DOCUMENT_STARTED);
    });
  });
});

describe('startFetchingData', () => {
  let mockSelfClient: SelfClient;

  /** Run init() with a valid passport so the actor is ready, then clear mocks
   *  and set passportData to whatever the individual test needs. */
  async function setupForFetch(passportData: Record<string, unknown>) {
    vitest.clearAllMocks();
    mockDocument({
      documentCategory: 'passport',
      mock: false,
      dsc_parsed: { authorityKeyIdentifier: 'key' },
    });
    mockSelfClient = createMockSelfClient();
    await useProvingStore.getState().init(mockSelfClient, 'register');
    actorMock.send.mockClear();
    (mockSelfClient.trackEvent as ReturnType<typeof vitest.fn>).mockClear();
    (mockSelfClient.logProofEvent as ReturnType<typeof vitest.fn>).mockClear();
    useProvingStore.setState({ passportData, env: 'prod' } as any);
  }

  it('emits FETCH_ERROR when dsc_parsed is missing for passport', async () => {
    await setupForFetch({ documentCategory: 'passport', mock: false });

    await useProvingStore.getState().startFetchingData(mockSelfClient);

    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_STARTED);
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'Missing parsed DSC in passport data',
    });
    expect(actorMock.send).not.toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
  });

  it('emits FETCH_ERROR when dsc_parsed exists but authorityKeyIdentifier is missing', async () => {
    await setupForFetch({
      documentCategory: 'passport',
      mock: false,
      dsc_parsed: { issuer: 'some-issuer' },
    });

    await useProvingStore.getState().startFetchingData(mockSelfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'Missing parsed DSC in passport data',
    });
  });

  it('emits FETCH_ERROR when dsc_parsed is missing for id_card', async () => {
    await setupForFetch({ documentCategory: 'id_card', mock: false });

    await useProvingStore.getState().startFetchingData(mockSelfClient);

    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_FAILED, {
      message: 'Missing parsed DSC in passport data',
    });
  });

  it('calls fetchAllTreesAndCircuits for passport with valid dsc_parsed', async () => {
    await setupForFetch({
      documentCategory: 'passport',
      mock: false,
      dsc_parsed: { authorityKeyIdentifier: 'test-aki-123' },
    });

    await useProvingStore.getState().startFetchingData(mockSelfClient);

    expect(fetchAllTreesAndCircuits).toHaveBeenCalledWith(mockSelfClient, 'passport', 'prod', 'test-aki-123');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
    expect(mockSelfClient.trackEvent).toHaveBeenCalledWith(ProofEvents.FETCH_DATA_SUCCESS);
  });

  it('calls fetchAllTreesAndCircuits for id_card with valid dsc_parsed', async () => {
    await setupForFetch({
      documentCategory: 'id_card',
      mock: false,
      dsc_parsed: { authorityKeyIdentifier: 'card-aki-456' },
    });

    await useProvingStore.getState().startFetchingData(mockSelfClient);

    expect(fetchAllTreesAndCircuits).toHaveBeenCalledWith(mockSelfClient, 'id_card', 'prod', 'card-aki-456');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
  });

  it('calls aadhaar.fetch_all for aadhaar documents', async () => {
    const mockFetchAll = vitest.fn().mockResolvedValue(undefined);
    const client = createMockSelfClient();
    (client as any).getProtocolState = () => ({
      aadhaar: { fetch_all: mockFetchAll },
    });

    // Bootstrap actor via init
    vitest.clearAllMocks();
    mockDocument({ documentCategory: 'aadhaar', mock: false });
    (client as any).getPrivateKey = vitest.fn().mockResolvedValue('secret');
    await useProvingStore.getState().init(client, 'disclose');
    actorMock.send.mockClear();
    (client.trackEvent as ReturnType<typeof vitest.fn>).mockClear();

    useProvingStore.setState({
      passportData: { documentCategory: 'aadhaar', mock: false },
      env: 'prod',
    } as any);

    await useProvingStore.getState().startFetchingData(client);

    expect(mockFetchAll).toHaveBeenCalledWith('prod');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
    expect(fetchAllTreesAndCircuits).not.toHaveBeenCalled();
  });

  it('calls kyc.fetch_all for kyc documents', async () => {
    const mockFetchAll = vitest.fn().mockResolvedValue(undefined);
    const client = createMockSelfClient();
    (client as any).getProtocolState = () => ({
      kyc: { fetch_all: mockFetchAll },
    });

    vitest.clearAllMocks();
    mockDocument({ documentCategory: 'kyc', mock: false });
    (client as any).getPrivateKey = vitest.fn().mockResolvedValue('secret');
    await useProvingStore.getState().init(client, 'disclose');
    actorMock.send.mockClear();
    (client.trackEvent as ReturnType<typeof vitest.fn>).mockClear();

    useProvingStore.setState({
      passportData: { documentCategory: 'kyc', mock: false },
      env: 'prod',
    } as any);

    await useProvingStore.getState().startFetchingData(client);

    expect(mockFetchAll).toHaveBeenCalledWith('prod');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
    expect(fetchAllTreesAndCircuits).not.toHaveBeenCalled();
  });
});
