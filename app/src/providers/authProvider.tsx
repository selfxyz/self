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
import Keychain from 'react-native-keychain';

import { AuthEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { useSettingStore } from '@/stores/settingStore';
import type { Mnemonic } from '@/types/mnemonic';
import analytics from '@/utils/analytics';

const { trackEvent } = analytics();

const SERVICE_NAME = 'secret';

type SignedPayload<T> = { signature: string; data: T };
const _getSecurely = async function <T>(
  fn: () => Promise<string | false>,
  formatter: (dataString: string) => T,
): Promise<SignedPayload<T> | null> {
  const dataString = await fn();
  if (dataString === false) {
    return null;
  }

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

    trackEvent(AuthEvents.BIOMETRIC_AUTH_SUCCESS);
    return {
      signature: 'authenticated',
      data: formatter(dataString),
    };
  } catch (error: unknown) {
    console.error('Error in _getSecurely:', error);
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

async function restoreFromMnemonic(mnemonic: string): Promise<string | false> {
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
      service: SERVICE_NAME,
    });
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

async function loadOrCreateMnemonic(): Promise<string | false> {
  const storedMnemonic = await Keychain.getGenericPassword({
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
  try {
    const { mnemonic } = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromEntropy(ethers.randomBytes(32)),
    );
    const data = JSON.stringify(mnemonic);
    await Keychain.setGenericPassword('secret', data, {
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
    useSettingStore.getState().incrementLoginCount();
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
    () => _getSecurely<Mnemonic>(loadOrCreateMnemonic, str => JSON.parse(str)),
    [],
  );

  const restoreAccountFromMnemonic = useCallback(
    (mnemonic: string) =>
      _getSecurely<boolean>(
        () => restoreFromMnemonic(mnemonic),
        str => !!str,
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

export async function hasSecretStored() {
  const seed = await Keychain.getGenericPassword({ service: SERVICE_NAME });
  return !!seed;
}

export async function unsafe_clearSecrets() {
  if (__DEV__) {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
  }
}

/**
 * The only reason this is exported without being locked behind user biometrics is to allow `loadPassportDataAndSecret`
 * to access both the privatekey and the passport data with the user only authenticating once
 */
export async function unsafe_getPrivateKey() {
  const foundMnemonic = await loadOrCreateMnemonic();
  if (!foundMnemonic) {
    return null;
  }
  const mnemonic = JSON.parse(foundMnemonic) as Mnemonic;
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic.phrase);
  return wallet.privateKey;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
