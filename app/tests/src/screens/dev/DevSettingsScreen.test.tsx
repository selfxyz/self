// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Alert } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import DevSettingsScreen from '@/screens/dev/DevSettingsScreen';

const mockDevTogglesSection = jest.fn(() => <div>DevToggles</div>);

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock react-native
jest.mock('react-native', () => ({
  __esModule: true,
  Alert: {
    alert: jest.fn(),
  },
  ScrollView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Platform: { OS: 'ios', select: jest.fn() },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0 })),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

// Mock Tamagui
jest.mock('tamagui', () => ({
  YStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock hooks and stores
jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(selector => {
    const state = {
      enableRecoveryCircuitTestFlow: false,
      setEnableRecoveryCircuitTestFlow: jest.fn(),
      loggingSeverity: 'info',
      setLoggingSeverity: jest.fn(),
      useStrongBox: false,
      setUseStrongBox: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  loadDocumentCatalogDirectlyFromKeychain: jest.fn(),
  saveDocumentCatalogDirectlyToKeychain: jest.fn(),
}));

jest.mock('@/screens/dev/hooks/useDangerZoneActions', () => ({
  useDangerZoneActions: jest.fn(() => ({
    handleClearSecretsPress: jest.fn(),
    handleClearDocumentCatalogPress: jest.fn(),
    handleClearPointEventsPress: jest.fn(),
    handleResetBackupStatePress: jest.fn(),
    handleClearBackupEventsPress: jest.fn(),
    handleClearPendingVerificationsPress: jest.fn(),
  })),
}));

jest.mock('@/screens/dev/hooks/useNotificationHandlers', () => ({
  useNotificationHandlers: jest.fn(() => ({
    hasNotificationPermission: false,
    subscribedTopics: [],
    handleTopicToggle: jest.fn(),
  })),
}));

// Mock sections
jest.mock('@/screens/dev/sections', () => ({
  DangerZoneSection: ({ onRemoveExpirationDateFlag, ...props }: any) => (
    <div {...props}>
      <button onClick={onRemoveExpirationDateFlag}>
        Remove Expiration Date Flag
      </button>
    </div>
  ),
  DebugShortcutsSection: () => <div>DebugShortcuts</div>,
  DevTogglesSection: (props: any) => mockDevTogglesSection(props),
  PushNotificationsSection: () => <div>PushNotifications</div>,
}));

jest.mock('@/screens/dev/components/ParameterSection', () => ({
  ParameterSection: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/screens/dev/components/LogLevelSelector', () => ({
  LogLevelSelector: () => <div>LogLevelSelector</div>,
}));

jest.mock('@/screens/dev/components/ErrorInjectionSelector', () => ({
  ErrorInjectionSelector: () => <div>ErrorInjectionSelector</div>,
}));

jest.mock('@/components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

// Mock icons
jest.mock('@/assets/icons/bug_icon.svg', () => 'BugIcon');

describe('DevSettingsScreen - handleRemoveExpirationDateFlagPress', () => {
  let mockLoadDocumentCatalog: jest.Mock;
  let mockSaveDocumentCatalog: jest.Mock;

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

  it('wires the recovery circuit test flow props into DevTogglesSection', () => {
    render(<DevSettingsScreen />);

    expect(mockDevTogglesSection).toHaveBeenCalledWith(
      expect.objectContaining({
        enableRecoveryCircuitTestFlow: false,
        setEnableRecoveryCircuitTestFlow: expect.any(Function),
        useStrongBox: false,
        setUseStrongBox: expect.any(Function),
      }),
    );
  });

  it('should show confirmation alert when Remove Expiration Date Flag is pressed', () => {
    const { root } = render(<DevSettingsScreen />);

    const button = root.findByType('button');
    expect(button).toBeTruthy();

    button.props.onClick();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Expiration Date Flag',
      'Are you sure you want to remove the expiration date flag for the current (selected) document?.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Remove', style: 'destructive' }),
      ]),
    );
  });

  it('should successfully remove expiration date flag when document is selected', async () => {
    const mockCatalog = {
      selectedDocumentId: 'doc-123',
      documents: [
        {
          id: 'doc-123',
          hasExpirationDate: true,
        },
      ],
    };

    mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);
    mockSaveDocumentCatalog.mockResolvedValue(undefined);

    const { root } = render(<DevSettingsScreen />);

    const button = root.findByType('button');
    button.props.onClick();

    // Get the onPress callback from the alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertCall[2].find((btn: any) => btn.text === 'Remove');

    // Execute the remove action
    await removeButton.onPress();

    await waitFor(() => {
      expect(mockLoadDocumentCatalog).toHaveBeenCalled();
      expect(mockSaveDocumentCatalog).toHaveBeenCalledWith({
        selectedDocumentId: 'doc-123',
        documents: [
          {
            id: 'doc-123',
            // hasExpirationDate should be deleted
          },
        ],
      });
    });

    // Success alert should be shown
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Expiration date flag removed successfully.',
        [{ text: 'OK' }],
      );
    });
  });

  it('should show error alert when no document is selected', async () => {
    const mockCatalog = {
      selectedDocumentId: 'non-existent-doc',
      documents: [
        {
          id: 'doc-123',
          hasExpirationDate: true,
        },
      ],
    };

    mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);

    const { root } = render(<DevSettingsScreen />);

    const button = root.findByType('button');
    button.props.onClick();

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertCall[2].find((btn: any) => btn.text === 'Remove');

    await removeButton.onPress();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'No Document Selected',
        'Please select a document before removing the expiration date flag.',
        [{ text: 'OK' }],
      );
    });

    // Should not attempt to save
    expect(mockSaveDocumentCatalog).not.toHaveBeenCalled();
  });

  it('should show error alert when loadDocumentCatalog fails', async () => {
    const mockError = new Error('Failed to load catalog');
    mockLoadDocumentCatalog.mockRejectedValue(mockError);

    // Mock console.error to avoid test output clutter
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { root } = render(<DevSettingsScreen />);

    const button = root.findByType('button');
    button.props.onClick();

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertCall[2].find((btn: any) => btn.text === 'Remove');

    await removeButton.onPress();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to remove expiration date flag:',
        'Failed to load catalog',
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to remove expiration date flag. Please try again.',
        [{ text: 'OK' }],
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should show error alert when saveDocumentCatalog fails', async () => {
    const mockCatalog = {
      selectedDocumentId: 'doc-123',
      documents: [
        {
          id: 'doc-123',
          hasExpirationDate: true,
        },
      ],
    };

    mockLoadDocumentCatalog.mockResolvedValue(mockCatalog);
    mockSaveDocumentCatalog.mockRejectedValue(new Error('Failed to save'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { root } = render(<DevSettingsScreen />);

    const button = root.findByType('button');
    button.props.onClick();

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const removeButton = alertCall[2].find((btn: any) => btn.text === 'Remove');

    await removeButton.onPress();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to remove expiration date flag. Please try again.',
        [{ text: 'OK' }],
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should not call saveDocumentCatalog when user cancels', async () => {
    const { root } = render(<DevSettingsScreen />);

    const button = root.findByType('button');
    button.props.onClick();

    // User cancels - should not load or save anything
    expect(mockLoadDocumentCatalog).not.toHaveBeenCalled();
    expect(mockSaveDocumentCatalog).not.toHaveBeenCalled();
  });
});
