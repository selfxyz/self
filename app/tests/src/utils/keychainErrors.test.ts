// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  getKeychainErrorIdentity,
  isKeychainCryptoError,
  isUserCancellation,
} from '@/utils/keychainErrors';

describe('keychainErrors', () => {
  it('identifies user cancellation errors', () => {
    expect(isUserCancellation({ code: 'E_AUTHENTICATION_FAILED' })).toBe(true);
    expect(isUserCancellation({ code: 'USER_CANCELED' })).toBe(true);
    expect(isUserCancellation({ message: 'User canceled' })).toBe(true);
    expect(isUserCancellation({ message: 'Authentication canceled' })).toBe(
      true,
    );
    expect(isUserCancellation({ message: 'cancelled by user' })).toBe(true);
  });

  it('does not classify non-cancellation errors as user cancellation', () => {
    expect(isUserCancellation({ code: 'E_CRYPTO_FAILED' })).toBe(false);
    expect(isUserCancellation({ message: 'Decryption failed' })).toBe(false);
    expect(isUserCancellation({})).toBe(false);
  });

  it('identifies crypto failures and excludes user cancellations', () => {
    expect(isKeychainCryptoError({ code: 'E_CRYPTO_FAILED' })).toBe(true);
    expect(
      isKeychainCryptoError({
        name: 'com.oblador.keychain.exceptions.CryptoFailedException',
      }),
    ).toBe(true);
    expect(
      isKeychainCryptoError({
        message: 'Authentication tag verification failed',
      }),
    ).toBe(true);
    expect(isKeychainCryptoError({ message: 'Decryption failed' })).toBe(true);
    expect(
      isKeychainCryptoError({
        code: 'E_AUTHENTICATION_FAILED',
        message: 'User canceled',
      }),
    ).toBe(false);
  });

  it('extracts keychain error identity safely', () => {
    expect(
      getKeychainErrorIdentity({
        code: 'E_CRYPTO_FAILED',
        name: 'com.oblador.keychain.exceptions.CryptoFailedException',
      }),
    ).toEqual({
      code: 'E_CRYPTO_FAILED',
      name: 'com.oblador.keychain.exceptions.CryptoFailedException',
    });
    expect(getKeychainErrorIdentity({})).toEqual({
      code: undefined,
      name: undefined,
    });
  });
});
