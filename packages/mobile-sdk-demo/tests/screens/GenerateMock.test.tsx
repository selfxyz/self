import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GenerateMock from '../../src/screens/GenerateMock';
import type { DocumentCatalog } from '@selfxyz/common';
import { sdkMocks } from '../mocks/sdk';

describe('GenerateMock screen', () => {
  beforeEach(() => {
    sdkMocks.reset();
  });

  it('creates a new mock document and navigates to registration for the first entry', async () => {
    const onNavigate = vi.fn();
    const onDocumentStored = vi.fn();
    const baseCatalog: DocumentCatalog = { documents: [] } as DocumentCatalog;

    const mockDocument = {
      documentType: 'mock_passport',
      documentCategory: 'passport',
      mock: true,
      mrz: 'LINE1\nLINE2',
    } as any;

    sdkMocks.selfClient.loadDocumentCatalog.mockResolvedValueOnce(baseCatalog);
    sdkMocks.generateMockDocumentMock.mockResolvedValueOnce(mockDocument);

    render(<GenerateMock onNavigate={onNavigate} onBack={() => {}} onDocumentStored={onDocumentStored} />);

    const generateButton = screen.getByRole('button', { name: /generate/i });

    await userEvent.click(generateButton);
    await waitFor(() => expect(sdkMocks.selfClient.saveDocument).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('register'));
    await waitFor(() => expect(onDocumentStored).toHaveBeenCalledTimes(1));

    const savedCatalog = sdkMocks.selfClient.saveDocumentCatalog.mock.calls.at(-1)?.[0];
    expect(savedCatalog?.documents).toHaveLength(1);
    expect(savedCatalog?.documents?.[0]).toMatchObject({
      documentType: 'mock_passport',
      mock: true,
    });
    expect(savedCatalog?.selectedDocumentId).toBeTruthy();
  });

  it('alerts on success when additional documents are generated', async () => {
    const onNavigate = vi.fn();
    const existingCatalog: DocumentCatalog = {
      documents: [
        {
          id: 'existing-doc',
          documentType: 'mock_passport',
          documentCategory: 'passport',
          data: 'MRZ',
          mock: true,
          isRegistered: false,
        },
      ],
    } as DocumentCatalog;

    const mockDocument = {
      documentType: 'mock_id_card',
      documentCategory: 'id_card',
      mock: true,
      mrz: 'LINEA\nLINEB',
    } as any;

    sdkMocks.selfClient.loadDocumentCatalog.mockResolvedValueOnce(existingCatalog);
    sdkMocks.generateMockDocumentMock.mockResolvedValueOnce(mockDocument);

    render(<GenerateMock onNavigate={onNavigate} onBack={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => expect(sdkMocks.selfClient.saveDocumentCatalog).toHaveBeenCalled());
    expect(onNavigate).not.toHaveBeenCalled();
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Success', 'Mock document generated successfully.'));

    const savedCatalog = sdkMocks.selfClient.saveDocumentCatalog.mock.calls.at(-1)?.[0];
    expect(savedCatalog?.documents?.length).toBe(2);
  });

  it('validates age input before generating', async () => {
    const baseCatalog: DocumentCatalog = { documents: [] } as DocumentCatalog;
    sdkMocks.selfClient.loadDocumentCatalog.mockResolvedValueOnce(baseCatalog);

    render(<GenerateMock onNavigate={() => {}} onBack={() => {}} />);

    const ageInput = screen.getByDisplayValue('21');
    await userEvent.clear(ageInput);
    await userEvent.type(ageInput, '999');

    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => expect(screen.getByText(/age must be a number between 0 and 120/i)).toBeInTheDocument());
    expect(sdkMocks.generateMockDocumentMock).not.toHaveBeenCalled();
  });
});
