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
  getDocumentAttributes,
  isDocumentValidForProving,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import { usePassport } from '@/providers/passportDataProvider';
import { DocumentSelectorForProvingScreen } from '@/screens/verification/DocumentSelectorForProvingScreen';

// Mock useFocusEffect to behave like useEffect in tests
// Note: We use a closure-based approach to avoid requiring React (prevents OOM per test-memory-optimization rules)
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  // Track execution per component instance using a Map
  const executionMap = new Map<object, boolean>();

  return {
    ...actual,
    useFocusEffect: (callback: () => void | (() => void)) => {
      // Use a stable object as key - in real usage, callback is stable due to useCallback
      if (!executionMap.has(callback)) {
        executionMap.set(callback, true);
        // Schedule callback to run after current render (simulates focus effect)
        Promise.resolve().then(() => {
          const cleanup = callback();
          if (typeof cleanup === 'function') {
            cleanup();
          }
        });
      }
    },
  };
});

// Mock the WalletAddressModal to avoid Modal rendering issues in tests
// Note: We return a simple string component directly to avoid requiring React (prevents OOM in CI)
jest.mock('@/components/proof-request/WalletAddressModal', () => ({
  WalletAddressModal: jest.fn(() => null),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
  getDocumentAttributes: jest.fn(),
  isDocumentValidForProving: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelfClient = useSelfClient as jest.MockedFunction<
  typeof useSelfClient
>;
const mockGetDocumentAttributes = getDocumentAttributes as jest.MockedFunction<
  typeof getDocumentAttributes
>;
const mockIsDocumentValidForProving =
  isDocumentValidForProving as jest.MockedFunction<
    typeof isDocumentValidForProving
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
  nationalitySlice?: string,
): MockDocumentEntry => ({
  metadata,
  data: {
    documentType: metadata.documentType as any,
    documentCategory: metadata.documentCategory as any,
    mock: metadata.mock,
    expiryDateSlice,
    nationalitySlice,
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
  disclosures: {
    name: true,
    passport_number: true,
  },
  userId: '0x1234567890abcdef1234567890abcdef12345678',
  userIdType: 'hex',
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

    mockIsDocumentValidForProving.mockImplementation(
      (_metadata, documentData) =>
        (documentData as { expiryDateSlice?: string } | undefined)
          ?.expiryDateSlice !== 'expired',
    );
    mockGetDocumentAttributes.mockImplementation((documentData: unknown) => ({
      nameSlice: '',
      dobSlice: '',
      yobSlice: '',
      issuingStateSlice: '',
      nationalitySlice:
        (documentData as { nationalitySlice?: string })?.nationalitySlice || '',
      passNoSlice: '',
      sexSlice: '',
      expiryDateSlice:
        (documentData as { expiryDateSlice?: string })?.expiryDateSlice || '',
      isPassportType: true,
    }));
  });

  describe('Loading and Initial State', () => {
    it('loads documents on mount and renders action bar', async () => {
      const passport = createMetadata({
        id: 'doc-1',
        documentType: 'us',
        isRegistered: true,
      });
      const catalog: DocumentCatalog = {
        documents: [passport],
        selectedDocumentId: 'doc-1',
      };
      const allDocs = createAllDocuments([createDocumentEntry(passport)]);

      mockLoadDocumentCatalog.mockResolvedValue(catalog);
      mockGetAllDocuments.mockResolvedValue(allDocs);

      const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

      // Wait for documents to load and verify action bar buttons are rendered
      // Note: Tamagui View doesn't forward testID, but Pressable children do
      await waitFor(() => {
        expect(
          getByTestId('document-selector-action-bar-approve'),
        ).toBeTruthy();
        expect(
          getByTestId('document-selector-action-bar-document-selector'),
        ).toBeTruthy();
      });

      // Verify mocks were called
      expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
      expect(mockGetAllDocuments).toHaveBeenCalledTimes(1);
    });

    it('renders wallet badge when userId is present', async () => {
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
          getByTestId('document-selector-action-bar-approve'),
        ).toBeTruthy();
      });

      // Wallet badge is a Pressable so testID works
      expect(
        getByTestId('document-selector-wallet-badge-pressable'),
      ).toBeTruthy();
    });
  });

  describe('Document Selection', () => {
    it('enables approve button when valid documents exist', async () => {
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
    });

    it('auto-selects first valid document when current selection is expired', async () => {
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
        selectedDocumentId: 'doc-1', // Currently selected is expired
      };

      mockLoadDocumentCatalog.mockResolvedValue(catalog);
      mockGetAllDocuments.mockResolvedValue(
        createAllDocuments([
          createDocumentEntry(expiredPassport, 'expired'),
          createDocumentEntry(validCard),
        ]),
      );

      const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

      // Should auto-select the valid document (doc-2)
      await waitFor(() => {
        expect(
          getByTestId('document-selector-action-bar-approve').props.disabled,
        ).toBe(false);
      });

      // Approve should select the auto-selected valid document
      fireEvent.press(getByTestId('document-selector-action-bar-approve'));

      await waitFor(() => {
        expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-2');
      });
    });

    it('disables approve button when only expired documents exist', async () => {
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
  });

  describe('Navigation and Approval', () => {
    it('navigates to Prove screen after successful approval', async () => {
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

      // Press approve directly from action bar
      fireEvent.press(getByTestId('document-selector-action-bar-approve'));

      await waitFor(() => {
        expect(mockSetSelectedDocument).toHaveBeenCalledWith('doc-1');
        expect(mockNavigate).toHaveBeenCalledWith('Prove', expect.any(Object));
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error state when document loading fails', async () => {
      mockLoadDocumentCatalog.mockRejectedValue(new Error('failure'));
      mockGetAllDocuments.mockResolvedValue({});

      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      render(<DocumentSelectorForProvingScreen />);

      // Wait for the load to fail and verify the error was logged
      await waitFor(() => {
        expect(mockLoadDocumentCatalog).toHaveBeenCalledTimes(1);
      });

      // Verify error was logged (component shows error state)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load documents:',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('shows error when document selection fails during approval', async () => {
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

      const { getByTestId } = render(<DocumentSelectorForProvingScreen />);

      await waitFor(() => {
        expect(
          getByTestId('document-selector-action-bar-approve').props.disabled,
        ).toBe(false);
      });

      // Press approve directly from action bar
      fireEvent.press(getByTestId('document-selector-action-bar-approve'));

      // Verify error was logged and navigation did not occur
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to set selected document:',
          expect.any(Error),
        );
      });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'Prove',
        expect.any(Object),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
