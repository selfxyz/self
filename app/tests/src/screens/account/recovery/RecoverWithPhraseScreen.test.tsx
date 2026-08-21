// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import RecoverWithPhraseScreen from '@/screens/account/recovery/RecoverWithPhraseScreen';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-view': any;
      'mock-text': any;
      'mock-textarea': any;
      'mock-stack': any;
      'mock-pressable': any;
      'mock-paste-icon': any;
      'mock-button': any;
    }
  }
}

jest.mock('react-native', () => ({
  __esModule: true,
  Keyboard: {
    dismiss: jest.fn(),
  },
  Pressable: ({ children, ...props }: any) => (
    <mock-pressable {...props}>{children}</mock-pressable>
  ),
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
}));

jest.mock('tamagui', () => ({
  __esModule: true,
  Text: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  TextArea: ({ children, ...props }: any) => (
    <mock-textarea {...props}>{children}</mock-textarea>
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    getString: jest.fn(),
  },
}));

jest.mock('ethers', () => ({
  ethers: {
    Mnemonic: {
      isValidMnemonic: jest.fn(() => true),
    },
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  markCurrentDocumentAsRegistered: jest.fn(),
  useSelfClient: jest.fn(),
}));

jest.mock('@/proving/checkRestoredDocumentRegistration', () => {
  class ProtocolDataUnavailableError extends Error {}
  return {
    checkRestoredDocumentRegistration: jest.fn(),
    ProtocolDataUnavailableError,
  };
});

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  Description: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  SecondaryButton: ({ children, onPress, disabled, ...props }: any) => (
    <mock-button onPress={onPress} disabled={disabled} {...props}>
      {children}
    </mock-button>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  BackupEvents: {
    CLOUD_RESTORE_FAILED_UNKNOWN: 'CLOUD_RESTORE_FAILED_UNKNOWN',
    CLOUD_RESTORE_FAILED_AUTH: 'CLOUD_RESTORE_FAILED_AUTH',
    CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED:
      'CLOUD_RESTORE_FAILED_PASSPORT_NOT_REGISTERED',
    ACCOUNT_RECOVERY_COMPLETED: 'ACCOUNT_RECOVERY_COMPLETED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  red500: '#f00',
  slate300: '#333',
  slate400: '#444',
  slate600: '#666',
  slate700: '#777',
  white: '#fff',
}));

jest.mock('@/assets/icons/paste.svg', () => ({
  __esModule: true,
  default: (props: any) => <mock-paste-icon {...props} />,
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
    phrase: {
      instructions: 'Recovery instructions',
      placeholder: 'Enter or paste your recovery phrase',
      paste: 'PASTE',
      submit: 'Continue',
    },
  },
}));

const { useNavigation } = jest.requireMock('@react-navigation/native') as {
  useNavigation: jest.Mock;
};
const { useSelfClient } = jest.requireMock('@selfxyz/mobile-sdk-alpha') as {
  useSelfClient: jest.Mock;
};
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

describe('RecoverWithPhraseScreen', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockRestoreAccountFromMnemonic = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

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
  });

  it('tracks only the error name for unexpected recovery failures', async () => {
    const restoreError = new Error(
      'mnemonic payload leaked into raw error message',
    );
    restoreError.name = 'SecureRestoreError';
    mockRestoreAccountFromMnemonic.mockRejectedValue(restoreError);

    const { UNSAFE_getByType } = render(<RecoverWithPhraseScreen />);

    fireEvent.changeText(
      UNSAFE_getByType('mock-textarea'),
      'valid seed phrase',
    );
    fireEvent.press(UNSAFE_getByType('mock-button'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        {
          reason: 'unexpected_error',
          error: 'SecureRestoreError',
        },
      );
    });

    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      'CLOUD_RESTORE_FAILED_UNKNOWN',
      expect.objectContaining({
        error: 'mnemonic payload leaked into raw error message',
      }),
    );
  });

  it('surfaces a retryable message when protocol data is unavailable', async () => {
    mockRestoreAccountFromMnemonic.mockResolvedValue(true);
    loadPassportData.mockResolvedValue('{"documentCategory":"passport"}');
    getPrivateKeyFromMnemonic.mockReturnValue('secret');
    mockCheckRegistration.mockRejectedValue(
      new MockProtocolDataUnavailableError('unavailable'),
    );

    const { UNSAFE_getByType, UNSAFE_getAllByType } = render(
      <RecoverWithPhraseScreen />,
    );

    fireEvent.changeText(
      UNSAFE_getByType('mock-textarea'),
      'valid seed phrase',
    );
    fireEvent.press(UNSAFE_getByType('mock-button'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'CLOUD_RESTORE_FAILED_UNKNOWN',
        { reason: 'protocol_data_unavailable', error: 'Error' },
      );
    });

    // Must not read as "your phrase is wrong" — the phrase was never checked.
    const renderedText = UNSAFE_getAllByType('mock-text').map(
      node => node.props.children,
    );
    expect(renderedText).toContain(
      'We couldn’t reach the Self network to verify your ID. Check your connection and try again.',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('completes recovery without re-storing the document when no alternative CSCA matched', async () => {
    mockRestoreAccountFromMnemonic.mockResolvedValue(true);
    loadPassportData.mockResolvedValue('{"documentCategory":"passport"}');
    getPrivateKeyFromMnemonic.mockReturnValue('secret');
    mockCheckRegistration.mockResolvedValue({
      isRegistered: true,
      csca: null,
    });

    const { UNSAFE_getByType } = render(<RecoverWithPhraseScreen />);

    fireEvent.changeText(
      UNSAFE_getByType('mock-textarea'),
      'valid seed phrase',
    );
    fireEvent.press(UNSAFE_getByType('mock-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('AccountVerifiedSuccess');
    });
    expect(reStorePassportDataWithRightCSCA).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('ACCOUNT_RECOVERY_COMPLETED');
  });
});
