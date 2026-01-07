// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { usePassport } from '@/providers/passportDataProvider';
import DocumentSelectorForProvingScreen from '@/screens/verification/DocumentSelectorForProvingScreen';

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

describe('DocumentSelectorForProvingScreen', () => {
  const mockNavigate = jest.fn();
  const mockLoadDocumentCatalog = jest.fn();
  const mockGetAllDocuments = jest.fn();
  const mockSetSelectedDocument = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);

    mockUseSelfClient.mockReturnValue({
      useSelfAppStore: (
        selector: (state: { selfApp: typeof mockSelfApp }) => any,
      ) => selector({ selfApp: mockSelfApp }),
    } as any);

    mockUsePassport.mockReturnValue({
      loadDocumentCatalog: mockLoadDocumentCatalog,
      getAllDocuments: mockGetAllDocuments,
      setSelectedDocument: mockSetSelectedDocument,
    } as any);
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
    const passport = createMetadata({ id: 'doc-1', documentType: 'us' });
    const idCard = createMetadata({
      id: 'doc-2',
      documentType: 'ca',
      documentCategory: 'id_card',
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

    const { findByText } = render(<DocumentSelectorForProvingScreen />);

    expect(await findByText('US Passport')).toBeTruthy();
    expect(await findByText('CA ID Card')).toBeTruthy();
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
      expect(getByTestId('document-selector-continue').props.disabled).toBe(
        false,
      );
    });

    fireEvent.press(getByTestId('document-selector-continue'));

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
      expect(getByTestId('document-selector-continue').props.disabled).toBe(
        false,
      );
    });

    fireEvent.press(getByTestId('document-selector-continue'));

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
      expect(getByTestId('document-selector-item-doc-2')).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-item-doc-2'));
    fireEvent.press(getByTestId('document-selector-continue'));

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  it('continue button is disabled when no valid document selected', async () => {
    const expiredPassport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const unregisteredCard = createMetadata({
      id: 'doc-2',
      documentType: 'ca',
      documentCategory: 'id_card',
      isRegistered: false,
    });
    const catalog: DocumentCatalog = {
      documents: [expiredPassport, unregisteredCard],
      selectedDocumentId: 'doc-1',
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([
        createDocumentEntry(expiredPassport, 'expired'),
        createDocumentEntry(unregisteredCard),
      ]),
    );

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-continue').props.disabled).toBe(
        true,
      );
    });
  });

  it('continue button is enabled when valid document selected', async () => {
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
      expect(getByTestId('document-selector-continue').props.disabled).toBe(
        false,
      );
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
      expect(getByTestId('document-selector-item-doc-2')).toBeTruthy();
    });

    fireEvent.press(getByTestId('document-selector-item-doc-2'));
    fireEvent.press(getByTestId('document-selector-continue'));

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-2');
    });
  });

  it('clicking Continue navigates to the Prove screen', async () => {
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
      expect(getByTestId('document-selector-continue').props.disabled).toBe(
        false,
      );
    });

    fireEvent.press(getByTestId('document-selector-continue'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Prove');
    });
  });

  it('shows empty state when no documents exist', async () => {
    const catalog: DocumentCatalog = { documents: [] };
    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue({});

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-empty')).toBeTruthy();
    });
  });

  it('shows error state when document loading fails', async () => {
    mockLoadDocumentCatalog.mockRejectedValue(new Error('failure'));
    mockGetAllDocuments.mockResolvedValue({});

    const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

    await waitFor(() => {
      expect(getByTestId('document-selector-error')).toBeTruthy();
    });
  });
});
