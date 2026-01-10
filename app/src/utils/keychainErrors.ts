// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type KeychainErrorIdentity = {
  code?: string;
  name?: string;
};

type KeychainError = {
  code?: string;
  message?: string;
  name?: string;
};

export type KeychainErrorType = 'user_cancelled' | 'crypto_failed';

export function getKeychainErrorIdentity(
  error: unknown,
): KeychainErrorIdentity {
  const err = error as KeychainError;
  return { code: err?.code, name: err?.name };
}

export function isKeychainCryptoError(error: unknown): boolean {
  const err = error as KeychainError;
  return Boolean(
    (err?.code === 'E_CRYPTO_FAILED' ||
      err?.name === 'com.oblador.keychain.exceptions.CryptoFailedException' ||
      err?.message?.includes('CryptoFailedException') ||
      err?.message?.includes('Decryption failed') ||
      err?.message?.includes('Authentication tag verification failed')) &&
    !isUserCancellation(error),
  );
}

export function isUserCancellation(error: unknown): boolean {
  const err = error as KeychainError;
  return Boolean(
    err?.code === 'E_AUTHENTICATION_FAILED' ||
    err?.code === 'USER_CANCELED' ||
    err?.message?.includes('User canceled') ||
    err?.message?.includes('Authentication canceled') ||
    err?.message?.includes('cancelled by user'),
  );
}
