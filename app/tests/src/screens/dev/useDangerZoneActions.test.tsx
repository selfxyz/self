// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useDangerZoneActions } from '@/screens/dev/hooks/useDangerZoneActions';

jest.spyOn(Alert, 'alert');

jest.mock('react-native', () => ({
  __esModule: true,
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('@/providers/authProvider', () => ({
  unsafe_clearSecrets: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  loadDocumentCatalogDirectlyFromKeychain: jest.fn(),
  saveDocumentCatalogDirectlyToKeychain: jest.fn(),
  usePassport: jest.fn(() => ({
    clearDocumentCatalogForMigrationTesting: jest.fn(),
  })),
}));

jest.mock('@/stores/pendingKycStore', () => ({
  usePendingKycStore: Object.assign(
    jest.fn(selector => {
      const state = {
        pendingVerifications: [],
        clearAllPendingVerifications: jest.fn(),
      };
      return selector ? selector(state) : state;
    }),
    { getState: jest.fn(() => ({ events: [] })) },
  ),
}));

jest.mock('@/stores/pointEventStore', () => ({
  usePointEventStore: Object.assign(
    jest.fn(selector => {
      const state = { clearEvents: jest.fn() };
      return selector ? selector(state) : state;
    }),
    { getState: jest.fn(() => ({ events: [], removeEvent: jest.fn() })) },
  ),
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(() => ({ resetBackupForPoints: jest.fn() })),
}));

describe('useDangerZoneActions - handleRemoveExpirationDateFlagPress', () => {
  let mockLoadDocumentCatalog: jest.Mock;
  let mockSaveDocumentCatalog: jest.Mock;

  const runRemoveAction = async () => {
    const { result } = renderHook(() => useDangerZoneActions());
    result.current.handleRemoveExpirationDateFlagPress();
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertCall[2].find((btn: any) => btn.text === 'Remove');
    await removeButton.onPress();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const passportProvider = jest.requireMock(
      '@/providers/passportDataProvider',
    );
    mockLoadDocumentCatalog =
      passportProvider.loadDocumentCatalogDirectlyFromKeychain;
    mockSaveDocumentCatalog =
      passportProvider.saveDocumentCatalogDirectlyToKeychain;
  });

  it('shows confirmation alert when invoked', () => {
    const { result } = renderHook(() => useDangerZoneActions());
    result.current.handleRemoveExpirationDateFlagPress();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Expiration Date Flag',
      'Are you sure you want to remove the expiration date flag for the current (selected) document?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Remove', style: 'destructive' }),
      ]),
    );
  });

  it('removes the expiration date flag from the selected document', async () => {
    mockLoadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'doc-123',
      documents: [{ id: 'doc-123', hasExpirationDate: true }],
    });
    mockSaveDocumentCatalog.mockResolvedValue(undefined);

    await runRemoveAction();

    expect(mockSaveDocumentCatalog).toHaveBeenCalledWith({
      selectedDocumentId: 'doc-123',
      documents: [{ id: 'doc-123' }],
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success',
      'Expiration date flag removed successfully.',
      [{ text: 'OK' }],
    );
  });

  it('alerts without saving when no document is selected', async () => {
    mockLoadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'missing',
      documents: [{ id: 'doc-123', hasExpirationDate: true }],
    });

    await runRemoveAction();

    expect(Alert.alert).toHaveBeenCalledWith(
      'No Document Selected',
      'Please select a document before removing the expiration date flag.',
      [{ text: 'OK' }],
    );
    expect(mockSaveDocumentCatalog).not.toHaveBeenCalled();
  });

  it('alerts on load failure', async () => {
    mockLoadDocumentCatalog.mockRejectedValue(new Error('load failed'));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runRemoveAction();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to remove expiration date flag. Please try again.',
      [{ text: 'OK' }],
    );
    consoleErrorSpy.mockRestore();
  });

  it('alerts on save failure', async () => {
    mockLoadDocumentCatalog.mockResolvedValue({
      selectedDocumentId: 'doc-123',
      documents: [{ id: 'doc-123', hasExpirationDate: true }],
    });
    mockSaveDocumentCatalog.mockRejectedValue(new Error('save failed'));
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runRemoveAction();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to remove expiration date flag. Please try again.',
      [{ text: 'OK' }],
    );
    consoleErrorSpy.mockRestore();
  });

  it('does nothing when the user cancels', () => {
    const { result } = renderHook(() => useDangerZoneActions());
    result.current.handleRemoveExpirationDateFlagPress();

    expect(mockLoadDocumentCatalog).not.toHaveBeenCalled();
    expect(mockSaveDocumentCatalog).not.toHaveBeenCalled();
  });
});
