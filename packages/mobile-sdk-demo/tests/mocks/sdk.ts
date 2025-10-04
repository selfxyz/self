import React from 'react';
import { vi } from 'vitest';

type SDKMocks = {
  selfClient: {
    loadDocumentCatalog: ReturnType<typeof vi.fn>;
    saveDocumentCatalog: ReturnType<typeof vi.fn>;
    deleteDocument: ReturnType<typeof vi.fn>;
  };
  useSelfClientMock: ReturnType<typeof vi.fn>;
  loadSelectedDocumentMock: ReturnType<typeof vi.fn>;
  extractNameFromDocumentMock: ReturnType<typeof vi.fn>;
  getAllDocumentsMock: ReturnType<typeof vi.fn>;
  generateMockDocumentMock: ReturnType<typeof vi.fn>;
  reset: () => void;
};

const createSelfClient = () => ({
  loadDocumentCatalog: vi.fn(async () => ({ documents: [] })),
  saveDocumentCatalog: vi.fn(async () => undefined),
  deleteDocument: vi.fn(async () => undefined),
});

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
  reset: () => {
    selfClient.loadDocumentCatalog.mockReset().mockResolvedValue({ documents: [] });
    selfClient.saveDocumentCatalog.mockReset().mockResolvedValue(undefined);
    selfClient.deleteDocument.mockReset().mockResolvedValue(undefined);
    useSelfClientMock.mockClear();
    loadSelectedDocumentMock.mockReset().mockResolvedValue(null);
    extractNameFromDocumentMock.mockReset().mockResolvedValue(null);
    getAllDocumentsMock.mockReset().mockResolvedValue({});
    generateMockDocumentMock.mockReset().mockResolvedValue(undefined);
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
  webScannerShim: {},
}));
