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
    }
  }
}

jest.mock('tamagui', () => ({
  __esModule: true,
  Separator: (props: any) => <mock-view {...props} />,
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

jest.mock('@selfxyz/common/utils/passports/validate', () => ({
  isUserRegisteredWithAlternativeCSCA: jest.fn(),
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
  PrimaryButton: ({ children, onPress, disabled, testID, ...props }: any) => (
    <mock-button
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      {...props}
    >
      {children}
    </mock-button>
  ),
  SecondaryButton: ({ children, onPress, disabled, ...props }: any) => (
    <mock-button onPress={onPress} disabled={disabled} {...props}>
      {children}
    </mock-button>
  ),
  Title: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  BackupEvents: {
    CLOUD_BACKUP_STARTED: 'CLOUD_BACKUP_STARTED',
    CLOUD_RESTORE_FAILED_UNKNOWN: 'CLOUD_RESTORE_FAILED_UNKNOWN',
    CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED:
      'CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED',
    CLOUD_RESTORE_SUCCESS: 'CLOUD_RESTORE_SUCCESS',
    ACCOUNT_RECOVERY_COMPLETED: 'ACCOUNT_RECOVERY_COMPLETED',
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

jest.mock('@/hooks/useHapticNavigation', () => jest.fn(() => jest.fn()));

jest.mock('@/integrations/haptics', () => ({
  impactLight: jest.fn(),
}));

jest.mock('@/layouts/ExpandableBottomLayout', () => ({
  ExpandableBottomLayout: {
    Layout: ({ children, ...props }: any) => (
      <mock-view {...props}>{children}</mock-view>
    ),
    TopSection: ({ children, ...props }: any) => (
      <mock-view {...props}>{children}</mock-view>
    ),
    BottomSection: ({ children, ...props }: any) => (
      <mock-view {...props}>{children}</mock-view>
    ),
  },
}));

jest.mock('@/providers/authProvider', () => ({
  getPrivateKeyFromMnemonic: jest.fn(),
  useAuth: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  loadPassportData: jest.fn(),
  reStorePassportDataWithRightCSCA: jest.fn(),
}));

jest.mock('@/screens/account/recovery/recoveryCopy', () => ({
  recoveryCopy: {
    choice: {
      title: 'Recover account',
      description: 'Choose a recovery method',
      noBiometrics: 'Biometrics unavailable',
      actions: {
        cloud: (restoring: boolean) =>
          restoring ? 'Restoring from cloud' : 'Restore from cloud',
        or: 'or',
        phrase: 'Enter recovery phrase',
      },
    },
  },
}));

jest.mock('@/services/cloud-backup', () => ({
  useBackupMnemonic: jest.fn(),
}));

jest.mock('@/stores/settingStore', () => ({
  useSettingStore: jest.fn(),
}));

const { useNavigation } = jest.requireMock('@react-navigation/native') as {
  useNavigation: jest.Mock;
};
const { isUserRegisteredWithAlternativeCSCA } = jest.requireMock(
  '@selfxyz/common/utils/passports/validate',
) as {
  isUserRegisteredWithAlternativeCSCA: jest.Mock;
};
const { markCurrentDocumentAsRegistered, useSelfClient } = jest.requireMock(
  '@selfxyz/mobile-sdk-alpha',
) as {
  markCurrentDocumentAsRegistered: jest.Mock;
  useSelfClient: jest.Mock;
};
const { useAuth, getPrivateKeyFromMnemonic } = jest.requireMock(
  '@/providers/authProvider',
) as {
  useAuth: jest.Mock;
  getPrivateKeyFromMnemonic: jest.Mock;
};
const { loadPassportData, reStorePassportDataWithRightCSCA } = jest.requireMock(
  '@/providers/passportDataProvider',
) as {
  loadPassportData: jest.Mock;
  reStorePassportDataWithRightCSCA: jest.Mock;
};
const { useBackupMnemonic } = jest.requireMock('@/services/cloud-backup') as {
  useBackupMnemonic: jest.Mock;
};
const { impactLight } = jest.requireMock('@/integrations/haptics') as {
  impactLight: jest.Mock;
};
const { useSettingStore } = jest.requireMock('@/stores/settingStore') as {
  useSettingStore: jest.Mock;
};

describe('AccountRecoveryChoiceScreen', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockRestoreAccountFromMnemonic = jest.fn();
  const mockDownload = jest.fn();
  const mockToggleCloudBackupEnabled = jest.fn();
  let enableRecoveryCircuitTestFlow = false;

  beforeEach(() => {
    jest.clearAllMocks();
    enableRecoveryCircuitTestFlow = false;

    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });

    useSelfClient.mockReturnValue({
      trackEvent: mockTrackEvent,
      useProtocolStore: {
        getState: jest.fn(() => ({
          passport: {
            commitment_tree: {},
            alternative_csca: {},
          },
          aadhaar: {
            public_keys: [],
          },
        })),
      },
    });

    useAuth.mockReturnValue({
      restoreAccountFromMnemonic: mockRestoreAccountFromMnemonic,
    });

    useBackupMnemonic.mockReturnValue({
      download: mockDownload,
    });

    useSettingStore.mockImplementation((selector: any) => {
      const state = {
        biometricsAvailable: true,
        cloudBackupEnabled: false,
        enableRecoveryCircuitTestFlow,
        toggleCloudBackupEnabled: mockToggleCloudBackupEnabled,
      };
      return selector ? selector(state) : state;
    });
  });

  async function completeSuccessfulCloudRecovery() {
    mockDownload.mockResolvedValue({ phrase: 'seed phrase' });
    mockRestoreAccountFromMnemonic.mockResolvedValue(true);
    loadPassportData.mockResolvedValue(JSON.stringify({ document: 'data' }));
    getPrivateKeyFromMnemonic.mockReturnValue('private-key');
    isUserRegisteredWithAlternativeCSCA.mockResolvedValue({
      isRegistered: true,
      csca: 'csca-cert',
    });

    const { getByTestId } = render(<AccountRecoveryChoiceScreen />);

    fireEvent.press(getByTestId('button-from-teststorage'));

    await waitFor(() => {
      expect(markCurrentDocumentAsRegistered).toHaveBeenCalled();
    });
  }

  it('navigates to Loading when the recovery circuit test flow is enabled', async () => {
    enableRecoveryCircuitTestFlow = true;

    await completeSuccessfulCloudRecovery();

    expect(reStorePassportDataWithRightCSCA).toHaveBeenCalledWith(
      { document: 'data' },
      'csca-cert',
    );
    expect(mockNavigate).toHaveBeenCalledWith({
      name: 'Loading',
      params: {},
    });
    expect(impactLight).not.toHaveBeenCalled();
  });

  it('navigates to AccountVerifiedSuccess when the recovery circuit test flow is disabled', async () => {
    await completeSuccessfulCloudRecovery();

    expect(mockNavigate).toHaveBeenCalledWith('AccountVerifiedSuccess');
    expect(impactLight).toHaveBeenCalledTimes(1);
  });
});
