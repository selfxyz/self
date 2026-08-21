// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AccountRecoveryChoiceScreen from '@/screens/account/recovery/AccountRecoveryChoiceScreen';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-view': any;
      'mock-text': any;
      'mock-stack': any;
      'mock-button': any;
      'mock-icon': any;
      'mock-separator': any;
    }
  }
}

jest.mock('tamagui', () => ({
  __esModule: true,
  Separator: (props: any) => <mock-separator {...props} />,
  View: ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  ),
  XStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
  YStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  markCurrentDocumentAsRegistered: jest.fn(),
  useSelfClient: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  Caption: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  Description: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  Title: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  PrimaryButton: ({ children, onPress, disabled, ...props }: any) => (
    <mock-button onPress={onPress} disabled={disabled} {...props}>
      {children}
    </mock-button>
  ),
  SecondaryButton: ({ children, onPress, disabled, ...props }: any) => (
    <mock-button onPress={onPress} disabled={disabled} {...props}>
      {children}
    </mock-button>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  BackupEvents: {
    ACCOUNT_RECOVERY_COMPLETED: 'ACCOUNT_RECOVERY_COMPLETED',
    CLOUD_BACKUP_STARTED: 'CLOUD_BACKUP_STARTED',
    CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED:
      'CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED',
    CLOUD_RESTORE_FAILED_UNKNOWN: 'CLOUD_RESTORE_FAILED_UNKNOWN',
    CLOUD_RESTORE_SUCCESS: 'CLOUD_RESTORE_SUCCESS',
    MANUAL_RECOVERY_SELECTED: 'MANUAL_RECOVERY_SELECTED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  slate500: '#555',
  slate600: '#666',
  white: '#fff',
}));

jest.mock('@/assets/icons/keyboard.svg', () => ({
  __esModule: true,
  default: (props: any) => <mock-icon {...props} />,
}));

jest.mock('@/assets/icons/restore_account.svg', () => ({
  __esModule: true,
  default: (props: any) => <mock-icon {...props} />,
}));

jest.mock('@/layouts/ExpandableBottomLayout', () => ({
  ExpandableBottomLayout: {
    Layout: ({ children }: any) => <mock-view>{children}</mock-view>,
    TopSection: ({ children }: any) => <mock-view>{children}</mock-view>,
    BottomSection: ({ children }: any) => <mock-view>{children}</mock-view>,
  },
}));

jest.mock('@/hooks/useHapticNavigation', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@/providers/authProvider', () => ({
  getPrivateKeyFromMnemonic: jest.fn(),
  useAuth: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  loadPassportData: jest.fn(),
  reStorePassportDataWithRightCSCA: jest.fn(),
}));

jest.mock('@/proving/checkRestoredDocumentRegistration', () => {
  class ProtocolDataUnavailableError extends Error {}
  return {
    checkRestoredDocumentRegistration: jest.fn(),
    ProtocolDataUnavailableError,
  };
});

jest.mock('@/screens/account/recovery/recoveryCopy', () => ({
  recoveryCopy: {
    choice: {
      title: 'Recover your Self account',
      description: 'Choose how you want to recover your account.',
      noBiometrics: 'Cloud recovery requires biometrics.',
      actions: {
        cloud: (restoring: boolean) => (restoring ? 'Recovering' : 'Recover'),
        or: 'OR',
        phrase: 'Enter your recovery phrase',
      },
    },
  },
}));

jest.mock('@/services/cloud-backup', () => ({
  STORAGE_NAME: 'iCloud',
  useBackupMnemonic: jest.fn(),
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(),
}));

const { useNavigation } = jest.requireMock('@react-navigation/native') as {
  useNavigation: jest.Mock;
};
const { useSelfClient, markCurrentDocumentAsRegistered } = jest.requireMock(
  '@selfxyz/mobile-sdk-alpha',
) as { useSelfClient: jest.Mock; markCurrentDocumentAsRegistered: jest.Mock };
const { useAuth, getPrivateKeyFromMnemonic } = jest.requireMock(
  '@/providers/authProvider',
) as { useAuth: jest.Mock; getPrivateKeyFromMnemonic: jest.Mock };
const { loadPassportData, reStorePassportDataWithRightCSCA } = jest.requireMock(
  '@/providers/passportDataProvider',
) as {
  loadPassportData: jest.Mock;
  reStorePassportDataWithRightCSCA: jest.Mock;
};
const {
  checkRestoredDocumentRegistration: mockCheckRegistration,
  ProtocolDataUnavailableError: MockProtocolDataUnavailableError,
} = jest.requireMock('@/proving/checkRestoredDocumentRegistration') as {
  checkRestoredDocumentRegistration: jest.Mock;
  ProtocolDataUnavailableError: new (message?: string) => Error;
};
const { useBackupMnemonic } = jest.requireMock('@/services/cloud-backup') as {
  useBackupMnemonic: jest.Mock;
};
const { useSettingStore } = jest.requireMock('@/stores/settingStore') as {
  useSettingStore: jest.Mock;
};
const useHapticNavigation = jest.requireMock('@/hooks/useHapticNavigation')
  .default as jest.Mock;

describe('AccountRecoveryChoiceScreen', () => {
  const mockTrackEvent = jest.fn();
  const mockRestoreAccountFromMnemonic = jest.fn();
  const mockDownload = jest.fn();
  const mockToggleCloudBackupEnabled = jest.fn();
  const mockRestoreSuccessNavigation = jest.fn();

  function pressRestoreFromCloud() {
    const { getByTestId } = render(<AccountRecoveryChoiceScreen />);
    fireEvent.press(getByTestId('button-from-teststorage'));
  }

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigation.mockReturnValue({ navigate: jest.fn() });
    useHapticNavigation.mockImplementation((route: string) =>
      route === 'AccountVerifiedSuccess'
        ? mockRestoreSuccessNavigation
        : jest.fn(),
    );
    useSelfClient.mockReturnValue({ trackEvent: mockTrackEvent });
    useAuth.mockReturnValue({
      restoreAccountFromMnemonic: mockRestoreAccountFromMnemonic,
    });
    useBackupMnemonic.mockReturnValue({ download: mockDownload });
    useSettingStore.mockReturnValue({
      cloudBackupEnabled: false,
      toggleCloudBackupEnabled: mockToggleCloudBackupEnabled,
      biometricsAvailable: true,
    });

    mockDownload.mockResolvedValue({ phrase: 'twenty four words' });
    mockRestoreAccountFromMnemonic.mockResolvedValue(true);
    loadPassportData.mockResolvedValue('{"documentCategory":"passport"}');
    getPrivateKeyFromMnemonic.mockReturnValue('secret');
  });

  it('completes recovery without re-storing the document when no alternative CSCA matched', async () => {
    // csca is null whenever the document's own keys were sufficient, and for
    // registered KYC documents. Passing it through to
    // reStorePassportDataWithRightCSCA used to dereference null.
    mockCheckRegistration.mockResolvedValue({ isRegistered: true, csca: null });

    pressRestoreFromCloud();

    await waitFor(() => {
      expect(markCurrentDocumentAsRegistered).toHaveBeenCalled();
    });
    expect(reStorePassportDataWithRightCSCA).not.toHaveBeenCalled();
    expect(mockToggleCloudBackupEnabled).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('CLOUD_RESTORE_SUCCESS');
    expect(mockTrackEvent).toHaveBeenCalledWith('ACCOUNT_RECOVERY_COMPLETED');
    expect(mockRestoreSuccessNavigation).toHaveBeenCalled();
  });

  it('re-stores the document when an alternative CSCA matched', async () => {
    mockCheckRegistration.mockResolvedValue({
      isRegistered: true,
      csca: 'matched-csca',
    });

    pressRestoreFromCloud();

    await waitFor(() => {
      expect(reStorePassportDataWithRightCSCA).toHaveBeenCalledWith(
        { documentCategory: 'passport' },
        'matched-csca',
      );
    });
  });

  it('reports a distinct reason when protocol data is unavailable', async () => {
    mockCheckRegistration.mockRejectedValue(
      new MockProtocolDataUnavailableError('unavailable'),
    );

    pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        { reason: 'protocol_data_unavailable', error: 'Error' },
      );
    });
    expect(mockToggleCloudBackupEnabled).not.toHaveBeenCalled();
    expect(mockRestoreSuccessNavigation).not.toHaveBeenCalled();
    expect(markCurrentDocumentAsRegistered).not.toHaveBeenCalled();
  });

  it('reports a backup download failure separately from a check failure', async () => {
    const downloadError = new Error('no backup');
    downloadError.name = 'BackupMissingError';
    mockDownload.mockRejectedValue(downloadError);

    pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        { reason: 'backup_download_failed', error: 'BackupMissingError' },
      );
    });
    expect(mockCheckRegistration).not.toHaveBeenCalled();
  });
});
