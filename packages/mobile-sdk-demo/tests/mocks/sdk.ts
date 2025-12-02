import React from 'react';
import { vi } from 'vitest';

type SDKMocks = {
  selfClient: {
    loadDocumentCatalog: ReturnType<typeof vi.fn>;
    saveDocumentCatalog: ReturnType<typeof vi.fn>;
    deleteDocument: ReturnType<typeof vi.fn>;
    saveDocument: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    scanDocument: ReturnType<typeof vi.fn>;
    useProvingStore: ((selector: (state: ProvingStoreState) => unknown) => unknown) & {
      getState: () => ProvingStoreState;
      setState: (next: Partial<ProvingStoreState> | ((state: ProvingStoreState) => Partial<ProvingStoreState>)) => void;
    };
    useMRZStore: ((selector: (state: MRZStoreState) => unknown) => unknown) & {
      getState: () => MRZStoreState;
      setState: (next: Partial<MRZStoreState> | ((state: MRZStoreState) => Partial<MRZStoreState>)) => void;
    };
  };
  useSelfClientMock: ReturnType<typeof vi.fn>;
  loadSelectedDocumentMock: ReturnType<typeof vi.fn>;
  extractNameFromDocumentMock: ReturnType<typeof vi.fn>;
  getAllDocumentsMock: ReturnType<typeof vi.fn>;
  generateMockDocumentMock: ReturnType<typeof vi.fn>;
  storePassportDataMock: ReturnType<typeof vi.fn>;
  provingState: ProvingStoreState;
  mrzState: MRZStoreState;
  reset: () => void;
};

type ProvingStoreState = {
  currentState: string;
  circuitType: string;
  init: ReturnType<typeof vi.fn>;
  setUserConfirmed: ReturnType<typeof vi.fn>;
};

type MRZStoreState = {
  mrzData: {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  } | null;
  setMRZ: ReturnType<typeof vi.fn>;
  getMRZ: () => {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  };
  clearMRZ: ReturnType<typeof vi.fn>;
};

const createProvingStore = () => {
  const state: ProvingStoreState = {
    currentState: 'idle',
    circuitType: 'register',
    init: vi.fn(),
    setUserConfirmed: vi.fn(),
  };

  const useProvingStore = ((selector: (value: ProvingStoreState) => unknown) =>
    selector(state)) as SDKMocks['selfClient']['useProvingStore'];

  useProvingStore.getState = () => state;
  useProvingStore.setState = next => {
    const updates = typeof next === 'function' ? next(state) : next;
    Object.assign(state, updates);
  };

  return { useProvingStore, state } as const;
};

const createMRZStore = () => {
  const defaultMRZData = {
    documentNumber: 'L898902C3',
    dateOfBirth: '740812',
    dateOfExpiry: '120415',
  };

  const state: MRZStoreState = {
    mrzData: defaultMRZData,
    setMRZ: vi.fn((data: any) => {
      state.mrzData = data;
    }),
    getMRZ: () => state.mrzData || defaultMRZData,
    clearMRZ: vi.fn(() => {
      state.mrzData = null;
    }),
  };

  const useMRZStore = ((selector: (value: MRZStoreState) => unknown) =>
    selector(state)) as SDKMocks['selfClient']['useMRZStore'];

  useMRZStore.getState = () => state;
  useMRZStore.setState = next => {
    const updates = typeof next === 'function' ? next(state) : next;
    Object.assign(state, updates);
  };

  return { useMRZStore, state } as const;
};

const createSelfClient = () => {
  const { useProvingStore, state: provingState } = createProvingStore();
  const { useMRZStore, state: mrzState } = createMRZStore();
  return {
    loadDocumentCatalog: vi.fn(async () => ({ documents: [] })),
    saveDocumentCatalog: vi.fn(async () => undefined),
    deleteDocument: vi.fn(async () => undefined),
    saveDocument: vi.fn(async () => undefined),
    on: vi.fn(() => vi.fn()),
    scanDocument: vi.fn(async () => ({
      mode: 'nfc',
      passportData: {
        dg1: 'mock-dg1-data',
        dg2: 'mock-dg2-data',
        sod: 'mock-sod-data',
      },
    })),
    useProvingStore,
    useMRZStore,
    provingState,
    mrzState,
  };
};

const selfClient = createSelfClient();
const useSelfClientMock = vi.fn(() => selfClient);
const loadSelectedDocumentMock = vi.fn(async () => null);
const extractNameFromDocumentMock = vi.fn(async () => null);
const getAllDocumentsMock = vi.fn(async () => ({}));
const generateMockDocumentMock = vi.fn(async () => undefined);
const storePassportDataMock = vi.fn(async () => undefined);

export const sdkMocks: SDKMocks = {
  selfClient,
  useSelfClientMock,
  loadSelectedDocumentMock,
  extractNameFromDocumentMock,
  getAllDocumentsMock,
  generateMockDocumentMock,
  storePassportDataMock,
  provingState: selfClient.provingState,
  mrzState: selfClient.mrzState,
  reset: () => {
    selfClient.loadDocumentCatalog.mockReset().mockResolvedValue({ documents: [] });
    selfClient.saveDocumentCatalog.mockReset().mockResolvedValue(undefined);
    selfClient.deleteDocument.mockReset().mockResolvedValue(undefined);
    selfClient.saveDocument.mockReset().mockResolvedValue(undefined);
    selfClient.on.mockReset().mockImplementation(() => vi.fn());
    selfClient.scanDocument.mockReset().mockResolvedValue({
      mode: 'nfc',
      passportData: {
        dg1: 'mock-dg1-data',
        dg2: 'mock-dg2-data',
        sod: 'mock-sod-data',
      },
    });
    useSelfClientMock.mockClear();
    loadSelectedDocumentMock.mockReset().mockResolvedValue(null);
    extractNameFromDocumentMock.mockReset().mockResolvedValue(null);
    getAllDocumentsMock.mockReset().mockResolvedValue({});
    generateMockDocumentMock.mockReset().mockResolvedValue(undefined);
    storePassportDataMock.mockReset().mockResolvedValue(undefined);
    selfClient.provingState.currentState = 'idle';
    selfClient.provingState.circuitType = 'register';
    selfClient.provingState.init.mockReset();
    selfClient.provingState.setUserConfirmed.mockReset();
    selfClient.mrzState.mrzData = {
      documentNumber: 'L898902C3',
      dateOfBirth: '740812',
      dateOfExpiry: '120415',
    };
    selfClient.mrzState.setMRZ.mockReset();
    selfClient.mrzState.clearMRZ.mockReset();
  },
};

vi.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  useSelfClient: useSelfClientMock,
  loadSelectedDocument: loadSelectedDocumentMock,
  extractNameFromDocument: extractNameFromDocumentMock,
  getAllDocuments: getAllDocumentsMock,
  generateMockDocument: generateMockDocumentMock,
  storePassportData: storePassportDataMock,
  signatureAlgorithmToStrictSignatureAlgorithm: (value: string) => value,
  SdkEvents: {},
  SelfClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  createListenersMap: () => ({ map: new Map() }),
  webNFCScannerShim: {},
}));
