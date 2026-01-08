// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { usePassport } from '@/providers/passportDataProvider';
import { DocumentSelectorForProvingScreen } from '@/screens/verification/DocumentSelectorForProvingScreen';

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

jest.mock('@/utils/documentAttributes', () => ({
  checkDocumentExpiration: jest.fn(
    (expiryDateSlice: string) => expiryDateSlice === 'expired',
  ),
  getDocumentAttributes: jest.fn(
    (documentData: { expiryDateSlice?: string }) => ({
      expiryDateSlice: documentData.expiryDateSlice,
    }),
  ),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelfClient = useSelfClient as jest.MockedFunction<
  typeof useSelfClient
>;
const mockUsePassport = usePassport as jest.MockedFunction<typeof usePassport>;

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

const mockSelfApp = {
  appName: 'Example App',
  endpoint: 'https://example.com',
  logoBase64: 'https://example.com/logo.png',
  sessionId: 'session-id',
};

const mockNavigate = jest.fn();
const mockLoadDocumentCatalog = jest.fn();
const mockGetAllDocuments = jest.fn();
const mockSetSelectedDocument = jest.fn();

// Stable passport context to prevent infinite re-renders
const stablePassportContext = {
  loadDocumentCatalog: mockLoadDocumentCatalog,
  getAllDocuments: mockGetAllDocuments,
  setSelectedDocument: mockSetSelectedDocument,
};

// Stable navigation object
const stableNavigation = {
  navigate: mockNavigate,
};

// Stable self client selector function
const stableSelfAppSelector = (
  selector: (state: { selfApp: typeof mockSelfApp }) => unknown,
) => selector({ selfApp: mockSelfApp });

// Stable self client object
const stableSelfClient = {
  useSelfAppStore: stableSelfAppSelector,
};

describe('DocumentSelectorForProvingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(stableNavigation as any);

    mockUseSelfClient.mockReturnValue(stableSelfClient as any);

    mockUsePassport.mockReturnValue(stablePassportContext as any);
  });

  it('renders loading state initially', () => {
    mockLoadDocumentCatalog.mockReturnValue(new Promise(() => {}));
    mockGetAllDocuments.mockResolvedValue({});

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    expect(getByTestId('document-selector-loading')).toBeTruthy();
  });

  it('displays app information from selfApp', async () => {
    const catalog: DocumentCatalog = { documents: [] };
    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue({});

    const { getByTestId, getByText } = render(
      <DocumentSelectorForProvingScreen />,
    );

    await waitFor(() => {
      expect(getByTestId('document-selector-logo')).toBeTruthy();
    });

    expect(getByText('example.com')).toBeTruthy();
    expect(getByText('Example App')).toBeTruthy();
  });

  it('loads and displays all documents from catalog', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const idCard = createMetadata({
      id: 'doc-2',
      documentType: 'ca',
      documentCategory: 'id_card',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport, idCard],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([
        createDocumentEntry(passport),
        createDocumentEntry(idCard),
      ]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-action-bar')).toBeTruthy();
    });

    // Open the sheet
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(getByTestId('document-selector-sheet-list')).toBeTruthy();
      expect(getByTestId('document-selector-sheet-item-doc-1')).toBeTruthy();
      expect(getByTestId('document-selector-sheet-item-doc-2')).toBeTruthy();
    });
  });

  it('auto-selects currently selected document if valid', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport)]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(false);
    });

    // Open sheet and approve
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(
        getByTestId('document-selector-sheet-approve-button'),
      ).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-sheet-approve-button'));

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  it('auto-selects first valid document if current selection is disabled', async () => {
    const expiredPassport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const validCard = createMetadata({
      id: 'doc-2',
      documentType: 'ca',
      documentCategory: 'id_card',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [expiredPassport, validCard],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([
        createDocumentEntry(expiredPassport, 'expired'),
        createDocumentEntry(validCard),
      ]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(false);
    });

    // Open sheet and approve
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(
        getByTestId('document-selector-sheet-approve-button'),
      ).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-sheet-approve-button'));

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-2');
    });
  });

  it('disabled documents cannot be selected', async () => {
    const validPassport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const expiredPassport = createMetadata({
      id: 'doc-2',
      documentType: 'fr',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [validPassport, expiredPassport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([
        createDocumentEntry(validPassport),
        createDocumentEntry(expiredPassport, 'expired'),
      ]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-action-bar')).toBeTruthy();
    });

    // Open sheet
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(getByTestId('document-selector-sheet-item-doc-2')).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-sheet-item-doc-2'));
    fireEvent.press(getByTestId('document-selector-sheet-approve-button'));

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  it('approve button is disabled when only expired documents exist', async () => {
    const expiredPassport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const expiredCard = createMetadata({
      id: 'doc-2',
      documentType: 'ca',
      documentCategory: 'id_card',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [expiredPassport, expiredCard],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([
        createDocumentEntry(expiredPassport, 'expired'),
        createDocumentEntry(expiredCard, 'expired'),
      ]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(true);
    });
  });

  it('unregistered documents are selectable for proving', async () => {
    const unregisteredPassport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: false,
    });
    const catalog: DocumentCatalog = {
      documents: [unregisteredPassport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(unregisteredPassport)]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      // Unregistered documents should be selectable
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(false);
    });
  });

  it('approve button is enabled when valid document selected', async () => {
    const validPassport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [validPassport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(validPassport)]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(false);
    });
  });

  it('selecting a different document updates selection state', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const idCard = createMetadata({
      id: 'doc-2',
      documentType: 'ca',
      documentCategory: 'id_card',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport, idCard],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([
        createDocumentEntry(passport),
        createDocumentEntry(idCard),
      ]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-action-bar')).toBeTruthy();
    });

    // Open sheet
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(getByTestId('document-selector-sheet-item-doc-2')).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-sheet-item-doc-2'));
    fireEvent.press(getByTestId('document-selector-sheet-approve-button'));

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-2');
    });
  });

  it('clicking Approve navigates to the Prove screen', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport)]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(false);
    });

    // Open sheet and approve
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(
        getByTestId('document-selector-sheet-approve-button'),
      ).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-sheet-approve-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Prove');
    });
  });

  it('shows error state when document loading fails', async () => {
    mockLoadDocumentCatalog.mockRejectedValue(new Error('failure'));
    mockGetAllDocuments.mockResolvedValue({});

    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-error')).toBeTruthy();
    });

    consoleWarnSpy.mockRestore();
  });

  it('retry button reloads documents after an error', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
      selectedDocumentId: 'doc-1',
    };

    // First attempt fails, retry succeeds
    mockLoadDocumentCatalog
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce(catalog);
    mockGetAllDocuments
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(
        createAllDocuments([createDocumentEntry(passport)]),
      );

    const consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const { getByTestId, queryByTestId } = render(
      <DocumentSelectorForProvingScreen />,
    );

    await waitFor(() => {
      expect(getByTestId('document-selector-error')).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-retry'));

    await waitFor(() => {
      expect(queryByTestId('document-selector-error')).toBeNull();
      expect(getByTestId('document-selector-action-bar')).toBeTruthy();
    });

    consoleWarnSpy.mockRestore();
  });

  it('shows an error when Approve fails to select the document', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport)]),
    );
    mockSetSelectedDocument.mockRejectedValue(new Error('Selection failed'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { getByTestId, getByText } = render(
      <DocumentSelectorForProvingScreen />,
    );

    await waitFor(() => {
      expect(
        getByTestId('document-selector-action-bar-approve').props.disabled,
      ).toBe(false);
    });

    // Open sheet and approve
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(
        getByTestId('document-selector-sheet-approve-button'),
      ).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-sheet-approve-button'));

    await waitFor(() => {
      expect(getByTestId('document-selector-error')).toBeTruthy();
    });

    expect(
      getByText('Failed to select document. Please try again.'),
    ).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalledWith('Prove');

    consoleErrorSpy.mockRestore();
  });

  it('clicking Dismiss button closes the sheet without selecting', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport)]),
    );

    const { getByTestId } = render(
      <DocumentSelectorForProvingScreen />,
    );

    await waitFor(() => {
      expect(getByTestId('document-selector-action-bar')).toBeTruthy();
    });

    // Open sheet
    fireEvent.press(
      getByTestId('document-selector-action-bar-document-selector'),
    );

    await waitFor(() => {
      expect(
        getByTestId('document-selector-sheet-dismiss-button'),
      ).toBeTruthy();
    });

    // Click dismiss
    fireEvent.press(getByTestId('document-selector-sheet-dismiss-button'));

    // Sheet should close (implementation detail - the sheet component handles this)
    // Document selection should not have been called
    expect(mockSetSelectedDocument).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
