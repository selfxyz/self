// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { AppState } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import AccountRecoveryChoiceScreen from '@/screens/account/recovery/AccountRecoveryChoiceScreen';
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
      'mock-separator': any;
    }
  }
}

jest.mock('tamagui', () => ({
  __esModule: true,
  Separator: (props: any) => <mock-separator {...props} />,
  Text: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
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

// Focus maps onto mount/unmount here: the screen under test is focused for as
// long as it is rendered, and the cleanup still runs on unmount.
jest.mock('@react-navigation/native', () => {
  const react = jest.requireActual('react');
  return {
    useNavigation: jest.fn(),
    useFocusEffect: (callback: () => void | (() => void)) =>
      react.useEffect(callback, [callback]),
  };
});

const appStateListeners: Array<(state: string) => void> = [];

function foregroundApp() {
  appStateListeners.forEach(listener => listener('active'));
}

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
    CLOUD_RESTORE_STARTED: 'CLOUD_RESTORE_STARTED',
    CLOUD_RESTORE_SUCCESS: 'CLOUD_RESTORE_SUCCESS',
    MANUAL_RECOVERY_SELECTED: 'MANUAL_RECOVERY_SELECTED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  red500: '#f00',
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
    errors: {
      no_backup_found: 'Error: no backup found',
      cloud_unavailable: 'Error: sign in to the cloud provider',
      sign_in_cancelled: 'Error: sign-in was dismissed',
      backup_corrupt: 'Error: backup could not be read',
      backup_read_failed: 'Error: could not reach the cloud provider',
      backup_not_synced: 'Error: still downloading from the cloud provider',
      restore_failed: 'Error: could not restore with this phrase',
      secret_storage_failed: 'Error: could not save securely on this device',
      not_registered: 'Error: phrase does not match a registered ID',
      network_error: 'Error: could not reach the Self network',
      unexpected_error: 'Error: something went wrong',
    },
  },
}));

jest.mock('@/services/cloud-backup', () => ({
  STORAGE_NAME: 'iCloud',
  useBackupMnemonic: jest.fn(),
}));

// A real zustand store, so the availability re-check actually re-renders the
// screen the way it does on device.
jest.mock('@/stores/settingStore', () => {
  const { create } = jest.requireActual('zustand');
  return {
    useSettingStore: create(
      (set: (partial: Record<string, unknown>) => void) => ({
        cloudBackupEnabled: false,
        toggleCloudBackupEnabled: jest.fn(),
        biometricsAvailable: false,
        setBiometricsAvailable: (biometricsAvailable: boolean) =>
          set({ biometricsAvailable }),
      }),
    ),
  };
});

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
  useSettingStore: {
    getState: () => {
      toggleCloudBackupEnabled: jest.Mock;
      biometricsAvailable: boolean;
      setBiometricsAvailable: (value: boolean) => void;
    };
    setState: (partial: Record<string, unknown>) => void;
  };
};
const useHapticNavigation = jest.requireMock('@/hooks/useHapticNavigation')
  .default as jest.Mock;
const { recoveryCopy } = jest.requireMock(
  '@/screens/account/recovery/recoveryCopy',
) as {
  recoveryCopy: {
    choice: { noBiometrics: string };
    errors: Record<string, string>;
  };
};

describe('AccountRecoveryChoiceScreen', () => {
  const mockTrackEvent = jest.fn();
  const mockRestoreAccountFromMnemonic = jest.fn();
  const mockDownload = jest.fn();
  const mockCheckBiometricsAvailable = jest.fn();
  const mockRestoreSuccessNavigation = jest.fn();
  const mockToggleCloudBackupEnabled = () =>
    useSettingStore.getState().toggleCloudBackupEnabled;

  function renderScreen() {
    const utils = render(<AccountRecoveryChoiceScreen />);
    return {
      ...utils,
      cloudButton: () => utils.getByTestId('button-from-teststorage'),
      renderedText: () =>
        utils.UNSAFE_getAllByType('mock-text').map(node => node.props.children),
    };
  }

  function pressRestoreFromCloud() {
    const utils = renderScreen();
    fireEvent.press(utils.cloudButton());
    return utils;
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
      checkBiometricsAvailable: mockCheckBiometricsAvailable,
    });
    useBackupMnemonic.mockReturnValue({ download: mockDownload });

    appStateListeners.length = 0;
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListeners.push(listener as (state: string) => void);
        return {
          remove: () => {
            const index = appStateListeners.indexOf(
              listener as (state: string) => void,
            );
            if (index >= 0) {
              appStateListeners.splice(index, 1);
            }
          },
        } as ReturnType<typeof AppState.addEventListener>;
      });

    useSettingStore.setState({
      cloudBackupEnabled: false,
      toggleCloudBackupEnabled: jest.fn(),
      biometricsAvailable: true,
    });

    mockCheckBiometricsAvailable.mockResolvedValue(true);
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
    expect(mockToggleCloudBackupEnabled()).toHaveBeenCalled();
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

    const { renderedText } = pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        { reason: 'protocol_data_unavailable', error: 'Error' },
      );
    });
    // Must read as retryable, never as "your document isn't registered" — the
    // registry was never reached, so registration was never actually checked.
    expect(renderedText()).toContain(recoveryCopy.errors.network_error);
    expect(renderedText()).not.toContain(recoveryCopy.errors.not_registered);
    expect(mockToggleCloudBackupEnabled()).not.toHaveBeenCalled();
    expect(mockRestoreSuccessNavigation).not.toHaveBeenCalled();
    expect(markCurrentDocumentAsRegistered).not.toHaveBeenCalled();
  });

  it('reports a backup download failure separately from a check failure', async () => {
    const downloadError = new Error('no backup');
    downloadError.name = 'BackupMissingError';
    mockDownload.mockRejectedValue(downloadError);

    const { renderedText } = pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        { reason: 'backup_download_failed', error: 'BackupMissingError' },
      );
    });
    // An unclassified download failure still has to say something.
    expect(renderedText()).toContain(recoveryCopy.errors.unexpected_error);
    expect(mockCheckRegistration).not.toHaveBeenCalled();
  });

  it('tracks one restore-started event per attempt and no backup event', async () => {
    mockCheckRegistration.mockResolvedValue({ isRegistered: true, csca: null });

    pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('CLOUD_RESTORE_STARTED');
    });
    expect(
      mockTrackEvent.mock.calls.filter(
        ([event]) => event === 'CLOUD_RESTORE_STARTED',
      ),
    ).toHaveLength(1);
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'CLOUD_BACKUP_STARTED',
      expect.anything(),
    );
    expect(mockTrackEvent).not.toHaveBeenCalledWith('CLOUD_BACKUP_STARTED');
  });

  describe.each([
    ['sign_in_cancelled'],
    ['cloud_unavailable'],
    ['no_backup_found'],
    ['backup_not_synced'],
    ['backup_corrupt'],
    ['backup_read_failed'],
  ] as const)('when the download fails with %s', reason => {
    it('renders that reason and reports it to analytics', async () => {
      mockDownload.mockRejectedValue(
        new CloudBackupError(reason, `download failed: ${reason}`),
      );

      const { renderedText } = pressRestoreFromCloud();

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'CLOUD_RESTORE_FAILED_UNKNOWN',
          { reason, error: 'CloudBackupError' },
        );
      });
      expect(renderedText()).toContain(recoveryCopy.errors[reason]);
      expect(mockCheckRegistration).not.toHaveBeenCalled();
    });
  });

  it('blames secure storage, not the phrase, when the restore itself fails', async () => {
    mockRestoreAccountFromMnemonic.mockResolvedValue(false);

    const { renderedText } = pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        { reason: 'secret_storage_failed' },
      );
    });
    // The user never typed a phrase on this path, and download() already
    // validated the one it fetched.
    expect(renderedText()).toContain(recoveryCopy.errors.secret_storage_failed);
    expect(renderedText()).not.toContain(recoveryCopy.errors.restore_failed);
  });

  it('explains an unregistered document without blaming the network', async () => {
    mockCheckRegistration.mockResolvedValue({
      isRegistered: false,
      csca: null,
    });

    const { renderedText } = pressRestoreFromCloud();

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED',
        { reason: 'document_not_registered', hasCSCA: false },
      );
    });
    expect(renderedText()).toContain(recoveryCopy.errors.not_registered);
    expect(renderedText()).not.toContain(recoveryCopy.errors.network_error);
  });

  it('clears a previous failure when the user retries', async () => {
    mockDownload.mockRejectedValueOnce(
      new CloudBackupError('no_backup_found', 'nothing there'),
    );

    const { cloudButton, renderedText } = renderScreen();
    fireEvent.press(cloudButton());

    await waitFor(() => {
      expect(renderedText()).toContain(recoveryCopy.errors.no_backup_found);
    });

    mockCheckRegistration.mockResolvedValue({ isRegistered: true, csca: null });
    fireEvent.press(cloudButton());

    await waitFor(() => {
      expect(markCurrentDocumentAsRegistered).toHaveBeenCalled();
    });
    expect(renderedText()).not.toContain(recoveryCopy.errors.no_backup_found);
  });

  it('explains why cloud restore is unavailable and keeps the phrase path usable', async () => {
    mockCheckBiometricsAvailable.mockResolvedValue(false);

    const { cloudButton, renderedText, UNSAFE_getAllByType } = renderScreen();

    await waitFor(() => {
      expect(cloudButton().props.disabled).toBe(true);
    });
    expect(renderedText()).toContain(recoveryCopy.choice.noBiometrics);

    // The phrase path is the fallback the notice points at, so it must stay live.
    const phraseButton = UNSAFE_getAllByType('mock-button').find(
      node => node.props.children !== undefined && node.props.disabled !== true,
    );
    expect(phraseButton).toBeDefined();
  });

  it('re-checks availability on focus rather than trusting a stale value', async () => {
    useSettingStore.setState({ biometricsAvailable: false });
    mockCheckBiometricsAvailable.mockResolvedValue(true);

    const { cloudButton } = renderScreen();

    // The stale `false` must not survive: focusing the screen re-reads the OS.
    await waitFor(() => {
      expect(cloudButton().props.disabled).toBe(false);
    });
    expect(mockCheckBiometricsAvailable).toHaveBeenCalled();
  });

  it('re-checks availability when the app returns to the foreground', async () => {
    mockCheckBiometricsAvailable.mockResolvedValue(false);

    const { cloudButton } = renderScreen();

    await waitFor(() => {
      expect(cloudButton().props.disabled).toBe(true);
    });

    // The user enrols biometrics in OS settings and comes back. The screen never
    // lost focus, so only the foreground transition can pick this up.
    mockCheckBiometricsAvailable.mockResolvedValue(true);
    foregroundApp();

    await waitFor(() => {
      expect(cloudButton().props.disabled).toBe(false);
    });
  });

  it('keeps the last known availability when the capability is indeterminate', async () => {
    // The provider resolves null (never rejects) when isSensorAvailable throws.
    mockCheckBiometricsAvailable.mockResolvedValue(null);
    useSettingStore.setState({ biometricsAvailable: true });

    const { cloudButton } = renderScreen();

    await waitFor(() => {
      expect(mockCheckBiometricsAvailable).toHaveBeenCalled();
    });
    // A failed query is not evidence that biometrics are unavailable, so a
    // transient native error must not disable cloud recovery.
    expect(cloudButton().props.disabled).toBe(false);
  });

  it('stops listening for foreground transitions once the screen unmounts', async () => {
    const { unmount } = renderScreen();

    await waitFor(() => {
      expect(appStateListeners).toHaveLength(1);
    });

    unmount();

    expect(appStateListeners).toHaveLength(0);
  });
});
