import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterDocument from '../../src/screens/RegisterDocument';
import type { DocumentCatalog, DocumentMetadata, IDDocument } from '@selfxyz/common';
import { sdkMocks } from '../mocks/sdk';

let registrationState = {
  registering: false,
  statusMessage: '',
  currentState: 'idle',
  logs: [] as string[],
  showLogs: false,
};

const startMock = vi.fn();
const setOnCompleteMock = vi.fn();
const toggleLogsMock = vi.fn();
const resetMock = vi.fn();
let onCompleteHandler: (() => Promise<void> | void) | null = null;

vi.mock('../../src/hooks/useRegistration', () => ({
  useRegistration: () => ({
    state: registrationState,
    actions: {
      start: startMock,
      setOnComplete: (cb: typeof onCompleteHandler) => {
        onCompleteHandler = cb;
        setOnCompleteMock(cb);
      },
      toggleLogs: toggleLogsMock,
      reset: resetMock,
    },
  }),
}));

describe('RegisterDocument screen', () => {
  beforeEach(() => {
    registrationState = {
      registering: false,
      statusMessage: '',
      currentState: 'idle',
      logs: [],
      showLogs: false,
    };
    startMock.mockReset();
    setOnCompleteMock.mockReset();
    toggleLogsMock.mockReset();
    resetMock.mockReset();
    onCompleteHandler = null;
  });

  const createCatalog = (documents: DocumentMetadata[]): DocumentCatalog => ({ documents }) as DocumentCatalog;

  it('lists unregistered documents and triggers registration flow', async () => {
    const catalog = createCatalog([
      {
        id: 'doc-1',
        documentType: 'mock_passport',
        documentCategory: 'passport',
        data: 'MRZ',
        mock: true,
        isRegistered: false,
      },
      {
        id: 'doc-2',
        documentType: 'mock_id_card',
        documentCategory: 'id_card',
        data: 'DATA',
        mock: false,
        isRegistered: true,
      },
    ]);

    const documentData: IDDocument = {
      documentType: 'mock_passport',
      documentCategory: 'passport',
      mock: true,
    } as IDDocument;

    sdkMocks.extractNameFromDocumentMock.mockImplementation(async (_client, id: string) => {
      if (id === 'doc-1') {
        return { firstName: 'Ada', lastName: 'Lovelace' };
      }
      return null;
    });
    sdkMocks.getAllDocumentsMock.mockResolvedValue({
      'doc-1': { data: documentData },
    });
    sdkMocks.selfClient.saveDocumentCatalog.mockResolvedValue(undefined);
    sdkMocks.selfClient.loadDocumentCatalog.mockResolvedValue(catalog);

    const onBack = vi.fn();
    const onSuccess = vi.fn();

    render(<RegisterDocument catalog={catalog} onBack={onBack} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByText(/ada lovelace/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: /register document/i })).toBeEnabled());

    await userEvent.click(screen.getByRole('button', { name: /register document/i }));

    await waitFor(() => expect(sdkMocks.selfClient.saveDocumentCatalog).toHaveBeenCalled());
    expect(startMock).toHaveBeenCalledWith('doc-1', documentData);

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);

    expect(setOnCompleteMock).toHaveBeenCalledWith(expect.any(Function));

    await act(async () => {
      await onCompleteHandler?.();
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success! 🎉',
        expect.stringContaining('registered on-chain'),
        expect.arrayContaining([expect.objectContaining({ text: 'OK' })]),
      ),
    );

    const alertCall = vi.mocked(Alert.alert).mock.calls.at(-1);
    const okButton = alertCall?.[2]?.find(button => button.text === 'OK');
    await act(async () => okButton?.onPress?.());

    expect(resetMock).toHaveBeenCalled();
  });

  it('shows an empty state when no unregistered documents exist', () => {
    const catalog = createCatalog([]);

    render(<RegisterDocument catalog={catalog} onBack={() => {}} />);

    expect(screen.getByText(/no unregistered documents available/i)).toBeInTheDocument();
  });

  it('displays a not found message when the selected document cannot be loaded', async () => {
    const catalog = createCatalog([
      {
        id: 'missing-doc',
        documentType: 'mock_passport',
        documentCategory: 'passport',
        data: 'MRZ',
        mock: true,
        isRegistered: false,
      },
    ]);

    sdkMocks.getAllDocumentsMock.mockResolvedValue({});

    render(<RegisterDocument catalog={catalog} onBack={() => {}} />);

    await waitFor(() => expect(screen.getByText(/document not found/i)).toBeInTheDocument());
  });
});
