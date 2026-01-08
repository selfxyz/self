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
import {
  isDocumentValidForProving,
  pickBestDocumentToSelect,
} from '@selfxyz/mobile-sdk-alpha';

import { ProvingScreenRouter } from '@/screens/verification/ProvingScreenRouter';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  isDocumentValidForProving: jest.fn(),
  pickBestDocumentToSelect: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockIsDocumentValidForProving =
  isDocumentValidForProving as jest.MockedFunction<
    typeof isDocumentValidForProving
  >;
const mockPickBestDocumentToSelect =
  pickBestDocumentToSelect as jest.MockedFunction<
    typeof pickBestDocumentToSelect
  >;
const mockUsePassport = usePassport as jest.MockedFunction<typeof usePassport>;
const mockUseSettingStore =
  useSettingStore as jest.MockedFunction<typeof useSettingStore>;

const mockReplace = jest.fn();
const mockLoadDocumentCatalog = jest.fn();
const mockGetAllDocuments = jest.fn();
const mockSetSelectedDocument = jest.fn();

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

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport, 'expired')]),
    );

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

    mockUseSettingStore.mockReturnValue({
      skipDocumentSelector: true,
      skipDocumentSelectorIfSingle: false,
    } as any);

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport)]),
    );
    mockPickBestDocumentToSelect.mockReturnValue('doc-1');

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
      expect(mockReplace).toHaveBeenCalledWith('Prove');
    });
  });

  it('routes to the document selector when skipping is disabled', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
    };

    mockLoadDocumentCatalog.mockResolvedValue(catalog);
    mockGetAllDocuments.mockResolvedValue(
      createAllDocuments([createDocumentEntry(passport)]),
    );

    render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('DocumentSelectorForProving');
    });
  });

  it('retries loading when document routing fails', async () => {
    const passport = createMetadata({
      id: 'doc-1',
      documentType: 'us',
      isRegistered: true,
    });
    const catalog: DocumentCatalog = {
      documents: [passport],
    };

    mockLoadDocumentCatalog
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValueOnce(catalog);
    mockGetAllDocuments
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(
        createAllDocuments([createDocumentEntry(passport)]),
      );

    const { getByTestId } = render(<ProvingScreenRouter />);

    await waitFor(() => {
      expect(getByTestId('proving-router-error')).toBeTruthy();
    });

    fireEvent.press(getByTestId('proving-router-retry'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('DocumentSelectorForProving');
    });
  });
});
