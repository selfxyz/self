import React from 'react';
import { vi } from 'vitest';

type SDKMocks = {
  selfClient: {
    loadDocumentCatalog: ReturnType<typeof vi.fn>;
    saveDocumentCatalog: ReturnType<typeof vi.fn>;
    deleteDocument: ReturnType<typeof vi.fn>;
    saveDocument: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    useProvingStore: ((selector: (state: ProvingStoreState) => unknown) => unknown) & {
      getState: () => ProvingStoreState;
      setState: (next: Partial<ProvingStoreState> | ((state: ProvingStoreState) => Partial<ProvingStoreState>)) => void;
    };
  };
  useSelfClientMock: ReturnType<typeof vi.fn>;
  loadSelectedDocumentMock: ReturnType<typeof vi.fn>;
  extractNameFromDocumentMock: ReturnType<typeof vi.fn>;
  getAllDocumentsMock: ReturnType<typeof vi.fn>;
  generateMockDocumentMock: ReturnType<typeof vi.fn>;
  provingState: ProvingStoreState;
  reset: () => void;
};

type ProvingStoreState = {
  currentState: string;
  circuitType: string;
  init: ReturnType<typeof vi.fn>;
  setUserConfirmed: ReturnType<typeof vi.fn>;
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

const createSelfClient = () => {
  const { useProvingStore, state } = createProvingStore();
  return {
    loadDocumentCatalog: vi.fn(async () => ({ documents: [] })),
    saveDocumentCatalog: vi.fn(async () => undefined),
    deleteDocument: vi.fn(async () => undefined),
    saveDocument: vi.fn(async () => undefined),
    on: vi.fn(() => vi.fn()),
    useProvingStore,
    provingState: state,
  };
};

const selfClient = createSelfClient();
const useSelfClientMock = vi.fn(() => selfClient);
const loadSelectedDocumentMock = vi.fn(async () => null);
const extractNameFromDocumentMock = vi.fn(async () => null);
const getAllDocumentsMock = vi.fn(async () => ({}));
const generateMockDocumentMock = vi.fn(async () => undefined);

export const sdkMocks: SDKMocks = {
  selfClient,
  useSelfClientMock,
  loadSelectedDocumentMock,
  extractNameFromDocumentMock,
  getAllDocumentsMock,
  generateMockDocumentMock,
  provingState: selfClient.provingState,
  reset: () => {
    selfClient.loadDocumentCatalog.mockReset().mockResolvedValue({ documents: [] });
    selfClient.saveDocumentCatalog.mockReset().mockResolvedValue(undefined);
    selfClient.deleteDocument.mockReset().mockResolvedValue(undefined);
    selfClient.saveDocument.mockReset().mockResolvedValue(undefined);
    selfClient.on.mockReset().mockImplementation(() => vi.fn());
    useSelfClientMock.mockClear();
    loadSelectedDocumentMock.mockReset().mockResolvedValue(null);
    extractNameFromDocumentMock.mockReset().mockResolvedValue(null);
    getAllDocumentsMock.mockReset().mockResolvedValue({});
    generateMockDocumentMock.mockReset().mockResolvedValue(undefined);
    selfClient.provingState.currentState = 'idle';
    selfClient.provingState.circuitType = 'register';
    selfClient.provingState.init.mockReset();
    selfClient.provingState.setUserConfirmed.mockReset();
  },
};

vi.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  useSelfClient: useSelfClientMock,
  loadSelectedDocument: loadSelectedDocumentMock,
  extractNameFromDocument: extractNameFromDocumentMock,
  getAllDocuments: getAllDocumentsMock,
  generateMockDocument: generateMockDocumentMock,
  signatureAlgorithmToStrictSignatureAlgorithm: (value: string) => value,
  SdkEvents: {},
  SelfClientProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  createListenersMap: () => ({ map: new Map() }),
  webNFCScannerShim: {},
}));
