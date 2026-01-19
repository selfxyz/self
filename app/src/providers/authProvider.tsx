// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import type { PropsWithChildren } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';
import type { GetOptions, SetOptions } from 'react-native-keychain';
import Keychain from 'react-native-keychain';

import { AuthEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import type { GetSecureOptions } from '@/integrations/keychain';
import {
  createKeychainOptions,
  detectSecurityCapabilities,
} from '@/integrations/keychain';
import { trackEvent } from '@/services/analytics';
import { useSettingStore } from '@/stores/settingStore';
import type { Mnemonic } from '@/types/mnemonic';
import {
  getKeychainErrorIdentity,
  isKeychainCryptoError,
  isUserCancellation,
} from '@/utils/keychainErrors';

const SERVICE_NAME = 'secret';

type SignedPayload<T> = { signature: string; data: T };
type KeychainOptions = {
  getOptions: GetOptions;
  setOptions: SetOptions;
};
const _getSecurely = async function <T>(
  fn: (keychainOptions: KeychainOptions) => Promise<string | false>,
  formatter: (dataString: string) => T,
  options: GetSecureOptions,
): Promise<SignedPayload<T> | null> {
  try {
    const capabilities = await detectSecurityCapabilities();
    const { getOptions, setOptions } = await createKeychainOptions(
      options,
      capabilities,
    );
    const dataString = await fn({ getOptions, setOptions });
    if (dataString === false) {
      return null;
    }

    trackEvent(AuthEvents.BIOMETRIC_AUTH_SUCCESS);
    return {
      signature: 'authenticated',
      data: formatter(dataString),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    trackEvent(AuthEvents.BIOMETRIC_AUTH_FAILED, {
      reason: 'unknown_error',
      error: message,
    });
    throw error;
  }
};

const _getWithBiometrics = async function <T>(
  fn: () => Promise<string | false>,
  formatter: (dataString: string) => T,
  _options: GetSecureOptions,
): Promise<SignedPayload<T> | null> {
  try {
    const simpleCheck = await biometrics.simplePrompt({
      promptMessage: 'Allow access to identity',
    });

    if (!simpleCheck.success) {
      trackEvent(AuthEvents.BIOMETRIC_AUTH_FAILED, {
        reason: 'unknown_error',
        error: 'Authentication failed',
      });
      throw new Error('Authentication failed');
    }

    const dataString = await fn();
    if (dataString === false) {
      return null;
    }

    return {
      signature: 'authenticated',
      data: formatter(dataString),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    trackEvent(AuthEvents.BIOMETRIC_AUTH_FAILED, {
      reason: 'unknown_error',
      error: message,
    });
    throw error;
  }
};

async function checkBiometricsAvailable(): Promise<boolean> {
  try {
    const { available } = await biometrics.isSensorAvailable();
    trackEvent(AuthEvents.BIOMETRIC_CHECK, { available });
    return available;
  } catch (error: unknown) {
    console.error('Error checking biometric availability:', error);
    const message = error instanceof Error ? error.message : String(error);
    trackEvent(AuthEvents.BIOMETRIC_CHECK, {
      reason: 'unknown_error',
      error: message,
    });
    return false;
  }
}

async function restoreFromMnemonic(
  mnemonic: string,
  options: KeychainOptions,
): Promise<string | false> {
  if (!mnemonic || !ethers.Mnemonic.isValidMnemonic(mnemonic)) {
    trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
      reason: 'invalid_mnemonic',
    });
    return false;
  }

  try {
    const restoredWallet = ethers.Wallet.fromPhrase(mnemonic);
    const data = JSON.stringify(restoredWallet.mnemonic);
    await Keychain.setGenericPassword('secret', data, {
      ...options.setOptions,
      service: SERVICE_NAME,
    });
    generateAndStorePointsAddress(mnemonic);
    trackEvent(AuthEvents.MNEMONIC_RESTORE_SUCCESS);
    return data;
  } catch (error: unknown) {
    trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
      reason: 'unknown_error',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

let keychainCryptoFailureCallback:
  | ((errorType: 'user_cancelled' | 'crypto_failed') => void)
  | null = null;

async function loadOrCreateMnemonic(
  keychainOptions: KeychainOptions,
): Promise<string | false> {
  // Get adaptive security configuration
  const { setOptions, getOptions } = keychainOptions;

  try {
    const storedMnemonic = await Keychain.getGenericPassword({
      ...getOptions,
      service: SERVICE_NAME,
    });
    if (storedMnemonic) {
      try {
        JSON.parse(storedMnemonic.password);
        trackEvent(AuthEvents.MNEMONIC_LOADED);
        return storedMnemonic.password;
      } catch (e: unknown) {
        console.error(
          'Error parsing stored mnemonic, old secret format was used',
          e,
        );
        trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
          reason: 'unknown_error',
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } catch (error: unknown) {
    if (isUserCancellation(error)) {
      console.log('User cancelled authentication');
      trackEvent(AuthEvents.BIOMETRIC_LOGIN_CANCELLED);

      if (keychainCryptoFailureCallback) {
        keychainCryptoFailureCallback('user_cancelled');
      }

      throw error;
    }

    if (isKeychainCryptoError(error)) {
      const err = getKeychainErrorIdentity(error);
      console.error('Keychain crypto error:', {
        code: err?.code,
        name: err?.name,
      });
      trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
        reason: 'keychain_crypto_failed',
        errorCode: err?.code,
      });

      if (keychainCryptoFailureCallback) {
        keychainCryptoFailureCallback('crypto_failed');
      }

      throw error;
    }

    console.error('Error loading mnemonic:', error);
    trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
      reason: 'unknown_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  try {
    const { mnemonic } = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromEntropy(ethers.randomBytes(32)),
    );
    const data = JSON.stringify(mnemonic);

    await Keychain.setGenericPassword('secret', data, {
      ...setOptions,
      service: SERVICE_NAME,
    });
    trackEvent(AuthEvents.MNEMONIC_CREATED);
    return data;
  } catch (error: unknown) {
    trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
      reason: 'unknown_error',
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const biometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});
interface AuthProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IAuthContext {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  loginWithBiometrics: () => Promise<void>;
  _getSecurely: typeof _getSecurely;
  _getWithBiometrics: typeof _getWithBiometrics;
  getOrCreateMnemonic: () => Promise<SignedPayload<Mnemonic> | null>;
  restoreAccountFromMnemonic: (
    mnemonic: string,
  ) => Promise<SignedPayload<boolean> | null>;
  checkBiometricsAvailable: () => Promise<boolean>;
}
export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isAuthenticating: false,
  loginWithBiometrics: () => Promise.resolve(),
  _getSecurely,
  _getWithBiometrics,
  getOrCreateMnemonic: () => Promise.resolve(null),
  restoreAccountFromMnemonic: () => Promise.resolve(null),
  checkBiometricsAvailable: () => Promise.resolve(false),
});

export const AuthProvider = ({
  children,
  authenticationTimeoutinMs = 15 * 60 * 1000,
}: AuthProviderProps) => {
  const [_, setAuthenticatedTimeout] =
    useState<ReturnType<typeof setTimeout>>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticatingPromise, setIsAuthenticatingPromise] =
    useState<Promise<{ success: boolean; error?: string }> | null>(null);

  const loginWithBiometrics = useCallback(async () => {
    if (isAuthenticatingPromise) {
      await isAuthenticatingPromise;
      return;
    }

    trackEvent(AuthEvents.BIOMETRIC_LOGIN_ATTEMPT);
    const promise = biometrics.simplePrompt({
      promptMessage: 'Confirm your identity to access the stored secret',
    });
    setIsAuthenticatingPromise(promise);
    const { success, error } = await promise;
    if (error) {
      setIsAuthenticatingPromise(null);
      trackEvent(AuthEvents.BIOMETRIC_LOGIN_FAILED, { error });
      throw error;
    }
    if (!success) {
      setIsAuthenticatingPromise(null);
      trackEvent(AuthEvents.BIOMETRIC_LOGIN_CANCELLED);
      throw new Error('Canceled by user');
    }

    setIsAuthenticatingPromise(null);
    setIsAuthenticated(true);
    trackEvent(AuthEvents.BIOMETRIC_LOGIN_SUCCESS);
    setAuthenticatedTimeout(previousTimeout => {
      if (previousTimeout) {
        clearTimeout(previousTimeout);
      }
      return setTimeout(() => {
        setIsAuthenticated(false);
        trackEvent(AuthEvents.AUTHENTICATION_TIMEOUT);
      }, authenticationTimeoutinMs);
    });
  }, [authenticationTimeoutinMs, isAuthenticatingPromise]);

  const getOrCreateMnemonic = useCallback(
    () =>
      _getSecurely<Mnemonic>(
        keychainOptions => loadOrCreateMnemonic(keychainOptions),
        str => JSON.parse(str),
        {
          requireAuth: true,
        },
      ),
    [],
  );

  const restoreAccountFromMnemonic = useCallback(
    (mnemonic: string) =>
      _getSecurely<boolean>(
        keychainOptions => restoreFromMnemonic(mnemonic, keychainOptions),
        str => !!str,
        {
          requireAuth: true,
        },
      ),
    [],
  );

  const state: IAuthContext = useMemo(
    () => ({
      isAuthenticated,
      isAuthenticating: !!isAuthenticatingPromise,
      loginWithBiometrics,
      getOrCreateMnemonic,
      restoreAccountFromMnemonic,
      checkBiometricsAvailable,
      _getSecurely,
      _getWithBiometrics,
    }),
    [
      getOrCreateMnemonic,
      isAuthenticated,
      isAuthenticatingPromise,
      loginWithBiometrics,
      restoreAccountFromMnemonic,
    ],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

function _generateAddressFromMnemonic(mnemonic: string, index: number): string {
  const wallet = ethers.HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`,
  );
  return wallet.address;
}

export async function generateAndStorePointsAddress(
  mnemonic: string,
): Promise<string> {
  const pointsAddr = _generateAddressFromMnemonic(mnemonic, 1);
  useSettingStore.getState().setPointsAddress(pointsAddr);
  return pointsAddr;
}

/**
 * Gets the second address if it exists, or generates and stores it if not.
 * By Generate, it means we need the user's biometric auth.
 *
 * Flow is, when the user visits the points screen for the first time, we need to generate the points address.
 */
export async function getOrGeneratePointsAddress(
  forceGenerateFromMnemonic: boolean = false,
): Promise<string> {
  const pointsAddress = useSettingStore.getState().pointsAddress;
  if (pointsAddress && !forceGenerateFromMnemonic) {
    return pointsAddress;
  }

  const mnemonicData = await _getSecurely<Mnemonic>(
    keychainOptions => loadOrCreateMnemonic(keychainOptions),
    str => JSON.parse(str),
    { requireAuth: true },
  );

  if (!mnemonicData?.data?.phrase) {
    throw new Error(
      'Failed to retrieve mnemonic for points address generation',
    );
  }

  const pointsAddr = _generateAddressFromMnemonic(mnemonicData.data.phrase, 1);

  useSettingStore.getState().setPointsAddress(pointsAddr);
  return pointsAddr;
}

export function getPrivateKeyFromMnemonic(mnemonic: string) {
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
  return wallet.privateKey;
}

export async function hasSecretStored() {
  const seed = await Keychain.getGenericPassword({ service: SERVICE_NAME });
  return !!seed;
}

// Migrates existing mnemonic to use new security settings with accessControl.
export async function migrateToSecureKeychain(): Promise<boolean> {
  try {
    const { hasCompletedKeychainMigration, setKeychainMigrationCompleted } =
      useSettingStore.getState();

    if (hasCompletedKeychainMigration) {
      return false;
    }

    // we try to get with old settings (no accessControl)
    const existingMnemonic = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });

    if (!existingMnemonic) {
      setKeychainMigrationCompleted();
      return false;
    }

    const capabilities = await detectSecurityCapabilities();
    const { setOptions } = await createKeychainOptions(
      { requireAuth: true },
      capabilities,
    );

    await Keychain.setGenericPassword(SERVICE_NAME, existingMnemonic.password, {
      ...setOptions,
      service: SERVICE_NAME,
    });

    trackEvent(AuthEvents.MNEMONIC_CREATED, { migrated: true });

    setKeychainMigrationCompleted();

    return true;
  } catch (error: unknown) {
    console.error('Error during keychain migration:', error);
    const message = error instanceof Error ? error.message : String(error);
    trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
      reason: 'migration_failed',
      error: message,
    });

    return false;
  }
}

// Global callback for keychain crypto failures
export function setKeychainCryptoFailureCallback(
  callback: ((errorType: 'user_cancelled' | 'crypto_failed') => void) | null,
) {
  keychainCryptoFailureCallback = callback;
}

export async function unsafe_clearSecrets() {
  if (__DEV__) {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
  }
}

/**
 * Retrieves the private key for the points address (derived at index 1) using the
 * same biometric protections and keychain options as other secret accessors.
 */
export async function unsafe_getPointsPrivateKey(
  keychainOptions?: KeychainOptions,
) {
  const options =
    keychainOptions ||
    (await createKeychainOptions({
      requireAuth: true,
    }));

  const foundMnemonic = await loadOrCreateMnemonic(options);
  if (!foundMnemonic) {
    return null;
  }
  const mnemonic = JSON.parse(foundMnemonic) as Mnemonic;
  const wallet = ethers.HDNodeWallet.fromPhrase(
    mnemonic.phrase,
    undefined,
    "m/44'/60'/0'/0/1",
  );
  return wallet.privateKey;
}

export async function unsafe_getPrivateKey(keychainOptions?: KeychainOptions) {
  const options =
    keychainOptions ||
    (await createKeychainOptions({
      requireAuth: true,
    }));

  const foundMnemonic = await loadOrCreateMnemonic(options);
  if (!foundMnemonic) {
    return null;
  }
  const mnemonic = JSON.parse(foundMnemonic) as Mnemonic;
  return getPrivateKeyFromMnemonic(mnemonic.phrase);
}

export const useAuth = () => {
  return useContext(AuthContext);
};
