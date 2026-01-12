// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '../../../src';
import { useProvingStore } from '../../../src/proving/provingMachine';
import { useProtocolStore } from '../../../src/stores/protocolStore';
import { useSelfAppStore } from '../../../src/stores/selfAppStore';
import { actorMock } from '../actorMock';

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
    getSKIPEM: vitest.fn(async () => 'ski-pem'),
    initPassportDataParsing: vitest.fn(),
  };
});

vitest.mock('../../../src/documents/utils', () => {
  return {
    clearPassportData: vitest.fn(),
    loadSelectedDocument: vitest.fn(),
    markCurrentDocumentAsRegistered: vitest.fn(),
    reStorePassportDataWithRightCSCA: vitest.fn(),
    storePassportData: vitest.fn(),
  };
});

vitest.mock('../../../src/stores', async () => {
  const actual = await vitest.importActual<typeof import('../../../src/stores')>('../../../src/stores');
  return {
    ...actual,
    fetchAllTreesAndCircuits: vitest.fn(),
    getCommitmentTree: vitest.fn(),
  };
});

vitest.mock('@selfxyz/common/utils/passports/validate', () => {
  return {
    checkDocumentSupported: vitest.fn(),
    checkIfPassportDscIsInTree: vitest.fn(),
    isDocumentNullified: vitest.fn(),
    isUserRegistered: vitest.fn(),
    isUserRegisteredWithAlternativeCSCA: vitest.fn(),
  };
});

const mockSelfClient: SelfClient = {
  getPrivateKey: vitest.fn().mockResolvedValue('secret'),
  trackEvent: vitest.fn(),
  logProofEvent: vitest.fn(),
  getSelfAppState: () => useSelfAppStore.getState(),
  getProvingState: () => useProvingStore.getState(),
  getProtocolState: () => useProtocolStore.getState(),
} as unknown as SelfClient;

const setProtocolFetchers = () => {
  useProtocolStore.setState(state => ({
    passport: {
      ...state.passport,
      fetch_all: vitest.fn(),
    },
    id_card: {
      ...state.id_card,
      fetch_all: vitest.fn(),
    },
    aadhaar: {
      ...state.aadhaar,
      fetch_all: vitest.fn(),
    },
  }));
};

describe('document processing helpers (via proving store)', () => {
  beforeEach(() => {
    vitest.clearAllMocks();
    setProtocolFetchers();
  });

  describe('parseIDDocument', () => {
    it('stores parsed passport data and emits PARSE_SUCCESS', async () => {
      const { loadSelectedDocument, storePassportData } = await import('../../../src/documents/utils');
      const { initPassportDataParsing } = await import('@selfxyz/common/utils');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });

      initPassportDataParsing.mockReturnValue({
        documentCategory: 'passport',
        passportMetadata: {
          dataGroups: [],
          dg1Size: 1,
          dg1HashSize: 2,
          dg1HashFunction: 'sha256',
          dg1HashOffset: 0,
          dgPaddingBytes: 0,
          eContentSize: 0,
          eContentHashFunction: 'sha256',
          eContentHashOffset: 0,
          signedAttrSize: 0,
          signedAttrHashFunction: 'sha256',
          signatureAlgorithm: 'rsa',
          saltLength: 0,
          curveOrExponent: 'exp',
          signatureAlgorithmBits: 2048,
          countryCode: 'US',
          cscaFound: true,
          cscaHashFunction: 'sha256',
          cscaSignatureAlgorithm: 'rsa',
          cscaSaltLength: 0,
          cscaCurveOrExponent: 'exp',
          cscaSignatureAlgorithmBits: 2048,
        },
      });

      await useProvingStore.getState().init(mockSelfClient, 'dsc');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        env: 'prod',
      } as any);

      await useProvingStore.getState().parseIDDocument(mockSelfClient);

      expect(storePassportData).toHaveBeenCalled();
      expect(useProvingStore.getState().passportData).toMatchObject({
        documentCategory: 'passport',
      });
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_SUCCESS' });
    });

    it('emits PARSE_ERROR when passport data is missing', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });

      await useProvingStore.getState().init(mockSelfClient, 'dsc');
      useProvingStore.setState({ passportData: null });

      await useProvingStore.getState().parseIDDocument(mockSelfClient);

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ERROR' });
    });

    it('emits PARSE_ERROR when parsing returns null', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');
      const { initPassportDataParsing } = await import('@selfxyz/common/utils');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      initPassportDataParsing.mockReturnValue(null);

      await useProvingStore.getState().init(mockSelfClient, 'dsc');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        env: 'prod',
      } as any);

      await useProvingStore.getState().parseIDDocument(mockSelfClient);

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PARSE_ERROR' });
    });
  });

  describe('startFetchingData', () => {
    it('emits FETCH_ERROR when dsc_parsed is missing', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });

      await useProvingStore.getState().init(mockSelfClient, 'register');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        env: 'prod',
      } as any);

      await useProvingStore.getState().startFetchingData(mockSelfClient);

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_ERROR' });
    });

    it('fetches protocol data for passport/id_card and emits FETCH_SUCCESS', async () => {
      const { fetchAllTreesAndCircuits } = await import('../../../src/stores');
      const { loadSelectedDocument } = await import('../../../src/documents/utils');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false, dsc_parsed: { authorityKeyIdentifier: 'aki' } },
      });

      await useProvingStore.getState().init(mockSelfClient, 'register');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false, dsc_parsed: { authorityKeyIdentifier: 'aki' } },
        env: 'prod',
      } as any);

      await useProvingStore.getState().startFetchingData(mockSelfClient);

      expect(fetchAllTreesAndCircuits).toHaveBeenCalledWith(mockSelfClient, 'passport', 'prod', 'aki');
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
    });

    it('fetches protocol data for aadhaar and emits FETCH_SUCCESS', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'aadhaar', mock: false },
      });

      await useProvingStore.getState().init(mockSelfClient, 'register');
      useProvingStore.setState({
        passportData: { documentCategory: 'aadhaar', mock: false },
        env: 'prod',
      } as any);

      await useProvingStore.getState().startFetchingData(mockSelfClient);

      expect(useProtocolStore.getState().aadhaar.fetch_all).toHaveBeenCalledWith('prod');
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'FETCH_SUCCESS' });
    });
  });

  describe('validatingDocument', () => {
    it('emits PASSPORT_NOT_SUPPORTED for unsupported documents', async () => {
      const { loadSelectedDocument, clearPassportData } = await import('../../../src/documents/utils');
      const { checkDocumentSupported } = await import('@selfxyz/common/utils/passports/validate');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      checkDocumentSupported.mockResolvedValue({ status: 'passport_not_supported', details: 'unsupported' });

      await useProvingStore.getState().init(mockSelfClient, 'register');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        secret: 'secret',
        circuitType: 'register',
      } as any);

      await useProvingStore.getState().validatingDocument(mockSelfClient);

      expect(clearPassportData).toHaveBeenCalled();
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PASSPORT_NOT_SUPPORTED' });
    });

    it('emits PASSPORT_DATA_NOT_FOUND when disclose and not registered', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');
      const { checkDocumentSupported, isUserRegistered } = await import('@selfxyz/common/utils/passports/validate');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      checkDocumentSupported.mockResolvedValue({ status: 'passport_supported' });
      isUserRegistered.mockResolvedValue(false);

      await useProvingStore.getState().init(mockSelfClient, 'disclose');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        secret: 'secret',
        circuitType: 'disclose',
      } as any);

      await useProvingStore.getState().validatingDocument(mockSelfClient);

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'PASSPORT_DATA_NOT_FOUND' });
    });

    it('emits ALREADY_REGISTERED when already registered and sets circuitType', async () => {
      const { loadSelectedDocument, reStorePassportDataWithRightCSCA, markCurrentDocumentAsRegistered } = await import(
        '../../../src/documents/utils'
      );
      const { checkDocumentSupported, isUserRegisteredWithAlternativeCSCA } = await import(
        '@selfxyz/common/utils/passports/validate'
      );

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      checkDocumentSupported.mockResolvedValue({ status: 'passport_supported' });
      isUserRegisteredWithAlternativeCSCA.mockResolvedValue({ isRegistered: true, csca: 'csca' });

      await useProvingStore.getState().init(mockSelfClient, 'register');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        secret: 'secret',
        circuitType: 'register',
      } as any);

      await useProvingStore.getState().validatingDocument(mockSelfClient);

      expect(reStorePassportDataWithRightCSCA).toHaveBeenCalled();
      await Promise.resolve();
      expect(markCurrentDocumentAsRegistered).toHaveBeenCalled();
      expect(useProvingStore.getState().circuitType).toBe('register');
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'ALREADY_REGISTERED' });
    });

    it('emits ACCOUNT_RECOVERY_CHOICE when nullified', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');
      const { checkDocumentSupported, isUserRegisteredWithAlternativeCSCA, isDocumentNullified } = await import(
        '@selfxyz/common/utils/passports/validate'
      );

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      checkDocumentSupported.mockResolvedValue({ status: 'passport_supported' });
      isUserRegisteredWithAlternativeCSCA.mockResolvedValue({ isRegistered: false });
      isDocumentNullified.mockResolvedValue(true);

      await useProvingStore.getState().init(mockSelfClient, 'register');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        secret: 'secret',
        circuitType: 'register',
      } as any);

      await useProvingStore.getState().validatingDocument(mockSelfClient);

      expect(actorMock.send).toHaveBeenCalledWith({ type: 'ACCOUNT_RECOVERY_CHOICE' });
    });

    it('sets circuitType to register when DSC is in tree and emits VALIDATION_SUCCESS', async () => {
      const { loadSelectedDocument } = await import('../../../src/documents/utils');
      const {
        checkDocumentSupported,
        isUserRegisteredWithAlternativeCSCA,
        isDocumentNullified,
        checkIfPassportDscIsInTree,
      } = await import('@selfxyz/common/utils/passports/validate');

      loadSelectedDocument.mockResolvedValue({
        data: { documentCategory: 'passport', mock: false },
      });
      checkDocumentSupported.mockResolvedValue({ status: 'passport_supported' });
      isUserRegisteredWithAlternativeCSCA.mockResolvedValue({ isRegistered: false });
      isDocumentNullified.mockResolvedValue(false);
      checkIfPassportDscIsInTree.mockResolvedValue(true);

      await useProvingStore.getState().init(mockSelfClient, 'dsc');
      useProvingStore.setState({
        passportData: { documentCategory: 'passport', mock: false },
        secret: 'secret',
        circuitType: 'dsc',
      } as any);

      await useProvingStore.getState().validatingDocument(mockSelfClient);

      expect(useProvingStore.getState().circuitType).toBe('register');
      expect(actorMock.send).toHaveBeenCalledWith({ type: 'VALIDATION_SUCCESS' });
    });
  });
});
