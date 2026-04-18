// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import useHasRealDocument from '@/hooks/useHasRealDocument';
import { usePassport } from '@/providers/passportDataProvider';
import ManageDocumentsScreen from '@/screens/documents/management/ManageDocumentsScreen';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-button': any;
      'mock-stack': any;
      'mock-text': any;
      'mock-spinner': any;
    }
  }
}

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0 })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('tamagui', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <mock-button onPress={onPress} {...props}>
      {children}
    </mock-button>
  ),
  ScrollView: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  Spinner: (props: any) => <mock-spinner {...props} />,
  Text: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  XStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  YStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  ButtonsContainer: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  PrimaryButton: ({ children, onPress, ...props }: any) => (
    <mock-button onPress={onPress} {...props}>
      {children}
    </mock-button>
  ),
  SecondaryButton: ({ children, onPress, ...props }: any) => (
    <mock-button onPress={onPress} {...props}>
      {children}
    </mock-button>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  borderColor: '#ddd',
  textBlack: '#111',
  white: '#fff',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  DocumentEvents: {
    MANAGE_SCREEN_OPENED: 'MANAGE_SCREEN_OPENED',
    ADD_NEW_SCAN_SELECTED: 'ADD_NEW_SCAN_SELECTED',
    ADD_NEW_MOCK_SELECTED: 'ADD_NEW_MOCK_SELECTED',
    DOCUMENTS_FETCHED: 'DOCUMENTS_FETCHED',
    NO_DOCUMENTS_FOUND: 'NO_DOCUMENTS_FOUND',
    DOCUMENT_DELETED: 'DOCUMENT_DELETED',
    DOCUMENT_SELECTED: 'DOCUMENT_SELECTED',
  },
}));

jest.mock('@tamagui/lucide-icons', () => ({
  Check: () => null,
  Eraser: () => null,
  HousePlus: () => null,
}));

jest.mock('@/hooks/useHasRealDocument', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/integrations/haptics', () => ({
  impactLight: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  usePassport: jest.fn(),
}));

const { useNavigation } = jest.requireMock('@react-navigation/native') as {
  useNavigation: jest.Mock;
};
const { useSelfClient } = jest.requireMock('@selfxyz/mobile-sdk-alpha') as {
  useSelfClient: jest.Mock;
};
const { impactLight } = jest.requireMock('@/integrations/haptics') as {
  impactLight: jest.Mock;
};

const mockUseHasRealDocument = useHasRealDocument as jest.MockedFunction<
  typeof useHasRealDocument
>;
const mockUsePassport = usePassport as jest.MockedFunction<typeof usePassport>;

describe('ManageDocumentsScreen', () => {
  const navigate = jest.fn();
  const trackEvent = jest.fn();
  const loadDocumentCatalog = jest.fn();
  const getAllDocuments = jest.fn();
  const deleteDocument = jest.fn();
  const setSelectedDocument = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue({ navigate });
    useSelfClient.mockReturnValue({ trackEvent });
    mockUseHasRealDocument.mockReturnValue({
      hasRealDocument: false,
      refresh: jest.fn(),
    });
    mockUsePassport.mockReturnValue({
      loadDocumentCatalog,
      getAllDocuments,
      deleteDocument,
      setSelectedDocument,
    } as ReturnType<typeof usePassport>);

    loadDocumentCatalog.mockResolvedValue({
      documents: [],
      selectedDocumentId: undefined,
    });
    getAllDocuments.mockResolvedValue({});
  });

  const getButtonLabels = (root: any): string[] =>
    root.findAllByType('mock-button').map((button: any) => {
      const { children } = button.props;
      return Array.isArray(children) ? children.join('') : String(children);
    });

  it('hides the View Document Info action when no real document exists', async () => {
    const { UNSAFE_root } = render(<ManageDocumentsScreen />);

    await waitFor(() => {
      expect(getButtonLabels(UNSAFE_root)).toEqual([
        'Add New Document',
        'Generate Mock Document',
      ]);
    });

    expect(getButtonLabels(UNSAFE_root)).not.toContain('View Document Info');
  });

  it('shows the View Document Info action and navigates to DocumentDataInfo', async () => {
    mockUseHasRealDocument.mockReturnValue({
      hasRealDocument: true,
      refresh: jest.fn(),
    });

    const { UNSAFE_root } = render(<ManageDocumentsScreen />);

    await waitFor(() => {
      expect(getButtonLabels(UNSAFE_root)).toEqual([
        'Add New Document',
        'View Document Info',
        'Generate Mock Document',
      ]);
    });

    fireEvent.press(UNSAFE_root.findAllByType('mock-button')[1]);

    expect(impactLight).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('DocumentDataInfo');
  });
});
