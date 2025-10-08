import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DocumentsList from '../../src/screens/DocumentsList';
import type { DocumentCatalog } from '@selfxyz/common';
import { sdkMocks } from '../mocks/sdk';

const useDocumentsMock = vi.fn();

vi.mock('../../src/hooks/useDocuments', () => ({
  useDocuments: () => useDocumentsMock(),
}));

describe('DocumentsList', () => {
  const baseCatalog: DocumentCatalog = { documents: [] } as DocumentCatalog;

  beforeEach(() => {
    useDocumentsMock.mockReset();
    sdkMocks.extractNameFromDocumentMock.mockReset().mockResolvedValue(null);
  });

  it('renders a loading indicator while documents load', () => {
    useDocumentsMock.mockReturnValue({
      documents: [],
      loading: true,
      error: null,
      deleting: null,
      clearing: false,
      refresh: vi.fn(),
      deleteDocument: vi.fn(),
      clearAllDocuments: vi.fn(),
    });

    render(<DocumentsList onBack={() => {}} catalog={baseCatalog} />);

    expect(screen.getByText(/loading your documents/i)).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', () => {
    useDocumentsMock.mockReturnValue({
      documents: [],
      loading: false,
      error: 'Boom!',
      deleting: null,
      clearing: false,
      refresh: vi.fn(),
      deleteDocument: vi.fn(),
      clearAllDocuments: vi.fn(),
    });

    render(<DocumentsList onBack={() => {}} catalog={baseCatalog} />);

    expect(screen.getByText(/we hit a snag/i)).toBeInTheDocument();
    expect(screen.getByText(/boom!/i)).toBeInTheDocument();
  });

  it('renders an empty state when there are no documents', () => {
    useDocumentsMock.mockReturnValue({
      documents: [],
      loading: false,
      error: null,
      deleting: null,
      clearing: false,
      refresh: vi.fn(),
      deleteDocument: vi.fn(),
      clearAllDocuments: vi.fn(),
    });

    render(<DocumentsList onBack={() => {}} catalog={baseCatalog} />);

    expect(screen.getByText(/no documents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled();
  });

  it('displays documents and supports delete and clear flows', async () => {
    const refresh = vi.fn();
    const deleteDocument = vi.fn(async () => undefined);
    const clearAllDocuments = vi.fn(async () => undefined);
    const documents = [
      {
        metadata: {
          id: '1234567890abcdef1234',
          documentType: 'mock_passport',
          documentCategory: 'passport',
          data: 'LINE1\nLINE2\nLINE3',
          mock: true,
          isRegistered: true,
        },
        data: {} as any,
      },
    ];

    useDocumentsMock.mockReturnValue({
      documents,
      loading: false,
      error: null,
      deleting: null,
      clearing: false,
      refresh,
      deleteDocument,
      clearAllDocuments,
    });

    sdkMocks.extractNameFromDocumentMock.mockResolvedValueOnce({ firstName: 'Ada', lastName: 'Lovelace' });

    render(<DocumentsList onBack={() => {}} catalog={baseCatalog} />);

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());

    expect(screen.getByText(/mock passport/i)).toBeInTheDocument();
    expect(screen.getByText(/registered/i)).toBeInTheDocument();
    expect(screen.getByText(/12345678…ef1234/i)).toBeInTheDocument();
    expect(screen.getByText(/line1/i)).toHaveTextContent(/LINE1\s+LINE2/);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(Alert.alert).toHaveBeenCalled();

    const deleteAlert = vi.mocked(Alert.alert).mock.calls.at(-1);
    const deleteConfirm = deleteAlert?.[2]?.find(button => button.text === 'Delete');
    await act(async () => deleteConfirm?.onPress?.());
    expect(deleteDocument).toHaveBeenCalledWith('1234567890abcdef1234');

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    const clearAlert = vi.mocked(Alert.alert).mock.calls.at(-1);
    const clearConfirm = clearAlert?.[2]?.find(button => button.text === 'Clear All');
    await act(async () => clearConfirm?.onPress?.());
    expect(clearAllDocuments).toHaveBeenCalledTimes(1);
  });
});
