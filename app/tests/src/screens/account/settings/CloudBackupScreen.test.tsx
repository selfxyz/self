// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CloudBackupScreen from '@/screens/account/settings/CloudBackupScreen';
// The real error class, so `isCloudBackupError` is exercised rather than stubbed.
import { CloudBackupError } from '@/services/cloud-backup/errors';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-view': any;
      'mock-text': any;
      'mock-stack': any;
      'mock-button': any;
      'mock-icon': any;
    }
  }
}

// The global react-native mock (jest.setup.js) exports no Alert; patch one onto
// the mocked module object — babel resolves `Alert.alert` at call time.
const mockAlert = jest.fn();
(jest.requireMock('react-native') as { Alert?: unknown }).Alert = {
  alert: mockAlert,
};

jest.mock('tamagui', () => ({
  __esModule: true,
  YStack: ({ children, ...props }: any) => (
    <mock-stack {...props}>{children}</mock-stack>
  ),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  hasAnyValidRegisteredDocument: jest.fn(),
  useSelfClient: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
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
    CLOUD_BACKUP_CANCELLED: 'CLOUD_BACKUP_CANCELLED',
    CLOUD_BACKUP_CONTINUE: 'CLOUD_BACKUP_CONTINUE',
    CLOUD_BACKUP_DISABLED_DONE: 'CLOUD_BACKUP_DISABLED_DONE',
    CLOUD_BACKUP_DISABLE_STARTED: 'CLOUD_BACKUP_DISABLE_STARTED',
    CLOUD_BACKUP_ENABLED_DONE: 'CLOUD_BACKUP_ENABLED_DONE',
    CLOUD_BACKUP_ENABLE_FAILED: 'CLOUD_BACKUP_ENABLE_FAILED',
    CLOUD_BACKUP_ENABLE_STARTED: 'CLOUD_BACKUP_ENABLE_STARTED',
    MANUAL_RECOVERY_SELECTED: 'MANUAL_RECOVERY_SELECTED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  blue600: '#00f',
  slate200: '#ccc',
  slate500: '#555',
  white: '#fff',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  advercase: 'Advercase',
  dinot: 'DINOT',
}));

jest.mock('@/hooks/useModal', () => ({
  // Imports navigationRef and drags in the whole navigation tree otherwise.
  useModal: jest.fn(() => ({ showModal: jest.fn(), dismissModal: jest.fn() })),
}));

jest.mock('@/integrations/haptics', () => ({
  buttonTap: jest.fn(),
  confirmTap: jest.fn(),
}));

jest.mock('@/providers/authProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/cloud-backup', () => ({
  STORAGE_NAME: 'iCloud',
  useBackupMnemonic: jest.fn(),
}));

jest.mock('@/stores/settingStore', () => {
  const { create } = jest.requireActual('zustand');
  return {
    useSettingStore: create(
      (set: (partial: Record<string, unknown>) => void) => ({
        cloudBackupEnabled: false,
        toggleCloudBackupEnabled: jest.fn(),
        biometricsAvailable: true,
        setBiometricsAvailable: (biometricsAvailable: boolean) =>
          set({ biometricsAvailable }),
      }),
    ),
  };
});

const { useSelfClient, hasAnyValidRegisteredDocument } = jest.requireMock(
  '@selfxyz/mobile-sdk-alpha',
) as { useSelfClient: jest.Mock; hasAnyValidRegisteredDocument: jest.Mock };
const { useAuth } = jest.requireMock('@/providers/authProvider') as {
  useAuth: jest.Mock;
};
const { useBackupMnemonic } = jest.requireMock('@/services/cloud-backup') as {
  useBackupMnemonic: jest.Mock;
};
const { useSettingStore } = jest.requireMock('@/stores/settingStore') as {
  useSettingStore: {
    getState: () => { toggleCloudBackupEnabled: jest.Mock };
    setState: (partial: Record<string, unknown>) => void;
  };
};

describe('CloudBackupScreen', () => {
  const mockTrackEvent = jest.fn();
  const mockUpload = jest.fn();
  const mockGetOrCreateMnemonic = jest.fn();
  const toggle = () => useSettingStore.getState().toggleCloudBackupEnabled;

  function pressEnableBackup() {
    const utils = render(
      <CloudBackupScreen route={{ params: undefined }} {...({} as any)} />,
    );
    // With cloudBackupEnabled false, the first pressable is the enable option.
    // (The global RN mock renders Pressable as the string component 'Pressable'.)
    fireEvent.press(utils.UNSAFE_getAllByType('Pressable' as any)[0]);
    return utils;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    useSelfClient.mockReturnValue({ trackEvent: mockTrackEvent });
    hasAnyValidRegisteredDocument.mockResolvedValue(true);
    useAuth.mockReturnValue({
      getOrCreateMnemonic: mockGetOrCreateMnemonic,
      loginWithBiometrics: jest.fn(),
    });
    useBackupMnemonic.mockReturnValue({
      upload: mockUpload,
      disableBackup: jest.fn(),
    });
    useSettingStore.setState({
      cloudBackupEnabled: false,
      toggleCloudBackupEnabled: jest.fn(),
      biometricsAvailable: true,
    });
    mockGetOrCreateMnemonic.mockResolvedValue({ data: { phrase: 'words' } });
  });

  it('enables backup and reports success', async () => {
    mockUpload.mockResolvedValue(undefined);

    pressEnableBackup();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('CLOUD_BACKUP_ENABLED_DONE');
    });
    expect(toggle()).toHaveBeenCalled();
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('alerts and reports a reason when the upload fails', async () => {
    mockUpload.mockRejectedValue(new Error('write failed'));

    pressEnableBackup();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_BACKUP_ENABLE_FAILED',
        { reason: 'unexpected_error', error: 'Error' },
      );
    });
    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      'Failed to enable cloud backups. Please try again.',
    );
    // A failed enable must leave the toggle off and never read as success.
    expect(toggle()).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'CLOUD_BACKUP_ENABLED_DONE',
    );
  });

  it('reports a dismissed biometric prompt without nagging the user', async () => {
    // getOrCreateMnemonic rethrows the raw keychain cancellation — it is not
    // a CloudBackupError, but it must not read as a failure either.
    mockGetOrCreateMnemonic.mockRejectedValue(
      Object.assign(new Error('User canceled the operation'), {
        code: 'USER_CANCELED',
      }),
    );

    pressEnableBackup();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_BACKUP_ENABLE_FAILED',
        { reason: 'authentication_cancelled', error: 'Error' },
      );
    });
    expect(mockAlert).not.toHaveBeenCalled();
    expect(toggle()).not.toHaveBeenCalled();
  });

  it('reports a cancelled sign-in without nagging the user', async () => {
    mockUpload.mockRejectedValue(
      new CloudBackupError('sign_in_cancelled', 'User canceled Google sign-in'),
    );

    pressEnableBackup();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_BACKUP_ENABLE_FAILED',
        { reason: 'sign_in_cancelled', error: 'CloudBackupError' },
      );
    });
    // The user dismissed the sheet themselves — an error alert would be noise.
    expect(mockAlert).not.toHaveBeenCalled();
    expect(toggle()).not.toHaveBeenCalled();
  });
});
