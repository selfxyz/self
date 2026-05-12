// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation, useRoute } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import {
  isDocumentValidForProving,
  pickBestDocumentToSelect,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import { usePassport } from '@/providers/passportDataProvider';
import { ProvingScreenRouter } from '@/screens/verification/ProvingScreenRouter';
import { useSettingStore } from '@/stores/settingStore';
import {
  evaluateGoogleUsatGate,
  evaluateGoogleUsatGateForDocument,
} from '@/utils/googleUsatGate';

// Mock useFocusEffect to behave like useEffect in tests
// Note: We use jest.requireActual for React to avoid nested require() which causes OOM in CI
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useRoute: jest.fn(() => ({ params: { entryPoint: 'qr_scan' } })),
    useFocusEffect: (callback: () => void) => {
      ReactActual.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  isDocumentValidForProving: jest.fn(),
  pickBestDocumentToSelect: jest.fn(),
  useSelfClient: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(),
}));

jest.mock('@/utils/googleUsatGate', () => ({
  evaluateGoogleUsatGate: jest.fn(),
  evaluateGoogleUsatGateForDocument: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
const mockIsDocumentValidForProving =
  isDocumentValidForProving as jest.MockedFunction<
    typeof isDocumentValidForProving
  >;
const mockUseSelfClient = useSelfClient as jest.MockedFunction<
  typeof useSelfClient
>;
const mockPickBestDocumentToSelect =
  pickBestDocumentToSelect as jest.MockedFunction<
    typeof pickBestDocumentToSelect
  >;
const mockUsePassport = usePassport as jest.MockedFunction<typeof usePassport>;
const mockUseSettingStore = useSettingStore as jest.MockedFunction<
  typeof useSettingStore
>;
const mockEvaluateGoogleUsatGate =
  evaluateGoogleUsatGate as jest.MockedFunction<typeof evaluateGoogleUsatGate>;
const mockEvaluateGoogleUsatGateForDocument =
  evaluateGoogleUsatGateForDocument as jest.MockedFunction<
    typeof evaluateGoogleUsatGateForDocument
  >;
const mockReplace = jest.fn();
const mockLoadDocumentCatalog = jest.fn();
const mockGetAllDocuments = jest.fn();
const mockSetSelectedDocument = jest.fn();
const mockTrackEvent = jest.fn();
const mockCleanSelfApp = jest.fn();
const mockSelfApp = { appName: 'Test App' };

type MockDocumentEntry = {
  metadata: DocumentMetadata;
  data: IDDocument;
};

const createMetadata = (
  overrides: Partial<DocumentMetadata> & { id: string },
): DocumentMetadata => ({
  id: overrides.id,
  documentType: overrides.documentType ?? 'us',
  documentCategory: overrides.documentCategory ?? 'passport',
  data: overrides.data ?? 'mock-data',
  mock: overrides.mock ?? false,
  isRegistered: overrides.isRegistered,
  registeredAt: overrides.registeredAt,
});

const createDocumentEntry = (
  metadata: DocumentMetadata,
  expiryDateSlice?: string,
): MockDocumentEntry => ({
  metadata,
  data: {
    documentType: metadata.documentType as any,
    documentCategory: metadata.documentCategory as any,
    mock: metadata.mock,
    expiryDateSlice,
  } as unknown as IDDocument,
});

const createAllDocuments = (entries: MockDocumentEntry[]) =>
  entries.reduce<
    Record<string, { data: IDDocument; metadata: DocumentMetadata }>
  >((acc, entry) => {
    acc[entry.metadata.id] = {
      data: entry.data,
      metadata: entry.metadata,
    };
    return acc;
  }, {});

describe('ProvingScreenRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({ replace: mockReplace } as any);
    mockUseRoute.mockReturnValue({ params: { entryPoint: 'qr_scan' } } as any);
    mockUseSelfClient.mockReturnValue({
      useSelfAppStore: (
        selector: (state: { selfApp: { appName: string } }) => unknown,
      ) => selector({ selfApp: mockSelfApp }),
      trackEvent: mockTrackEvent,
      getSelfAppState: () => ({
        cleanSelfApp: mockCleanSelfApp,
      }),
    } as any);
    mockEvaluateGoogleUsatGate.mockResolvedValue('allow');
    mockEvaluateGoogleUsatGateForDocument.mockResolvedValue('allow');

    mockUsePassport.mockReturnValue({
      loadDocumentCatalog: mockLoadDocumentCatalog,
      getAllDocuments: mockGetAllDocuments,
      setSelectedDocument: mockSetSelectedDocument,
    } as any);

    mockUseSettingStore.mockReturnValue({
      skipDocumentSelector: false,
      skipDocumentSelectorIfSingle: false,
    } as any);

    mockIsDocumentValidForProving.mockImplementation(
      (_metadata, documentData) =>
        (documentData as { expiryDateSlice?: string } | undefined)
          ?.expiryDateSlice !== 'expired',
    );
  });

  it('routes to DocumentDataNotFound when no valid documents exist', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
    };
    const allDocs = createAllDocuments([
      createDocumentEntry(passport, 'expired'),
    ]);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(allDocs);

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('DocumentDataNotFound');
    });
  });

  it('auto-selects and routes to Prove when skipping the selector', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
    };
    const allDocs = createAllDocuments([createDocumentEntry(passport)]);

    mockUseSettingStore.mockReturnValue({
      skipDocumentSelector: true,
      skipDocumentSelectorIfSingle: false,
    } as any);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(allDocs);
    mockPickBestDocumentToSelect.mockReturnValue('doc-1');

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
      expect(mockReplace).toHaveBeenCalledWith('Prove');
    });
  });

  it('routes to the document selector when skipping is disabled', async () => {
    const passport1 = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const passport2 = createMetadata({
      id: 'doc-2',
      documentType: 'gb',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport1, passport2],
    };
    const allDocs = createAllDocuments([
      createDocumentEntry(passport1),
      createDocumentEntry(passport2),
    ]);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(allDocs);

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('DocumentSelectorForProving', {
        documentType: 'Passport',
        entryPoint: 'qr_scan',
      });
    });
  });

  it('shows error state when document loading fails', async () => {
    mockLoadDocumentCatalog.mockRejectedValue(new Error('failure'));
    mockGetAllDocuments.mockResolvedValue({});

    render(<ProvingScreenRouter />);

    // Verify that the load was attempted and navigation was NOT called
    await waitFor(() => {
      expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
    });

    // The error path should NOT navigate anywhere
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('auto-selects when skipDocumentSelectorIfSingle is true with exactly 1 valid document', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
    };
    const allDocs = createAllDocuments([createDocumentEntry(passport)]);

    mockUseSettingStore.mockReturnValue({
      skipDocumentSelector: false,
      skipDocumentSelectorIfSingle: true,
    } as any);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(allDocs);
    mockPickBestDocumentToSelect.mockReturnValue('doc-1');

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
      expect(mockReplace).toHaveBeenCalledWith('Prove');
    });
  });

  it('shows document selector when skipDocumentSelectorIfSingle is true with multiple valid documents', async () => {
    const passport1 = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const passport2 = createMetadata({
      id: 'doc-2',
      documentType: 'gb',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport1, passport2],
    };
    const allDocs = createAllDocuments([
      createDocumentEntry(passport1),
      createDocumentEntry(passport2),
    ]);

    mockUseSettingStore.mockReturnValue({
      skipDocumentSelector: false,
      skipDocumentSelectorIfSingle: true,
    } as any);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(allDocs);

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('DocumentSelectorForProving', {
        documentType: 'Passport',
        entryPoint: 'qr_scan',
      });
    });

    // Should NOT auto-select since there are multiple documents
    expect(mockSetSelectedDocument).not.toHaveBeenCalled();
  });

  it('falls back to document selector when setSelectedDocument fails', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
    };
    const allDocs = createAllDocuments([createDocumentEntry(passport)]);

    mockUseSettingStore.mockReturnValue({
      skipDocumentSelector: true,
      skipDocumentSelectorIfSingle: false,
    } as any);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(allDocs);
    mockPickBestDocumentToSelect.mockReturnValue('doc-1');
    mockSetSelectedDocument.mockRejectedValue(new Error('Selection failed'));

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
      expect(mockReplace).toHaveBeenCalledWith('DocumentSelectorForProving', {
        documentType: 'Passport',
        entryPoint: 'qr_scan',
      });
    });
  });
});
