// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/*
 * This entire file is a stub and MUST be replaced
 *
 */

import type { PropsWithChildren } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { AuthEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { trackEvent } from '@/services/analytics';
import type { Mnemonic } from '@/types/mnemonic';

type SignedPayload<T> = { signature: string; data: T };

// Check if Android bridge is available
interface AndroidBridge {
  getPrivateKey(): Promise<string>;
}

declare global {
  interface Window {
    // TODO ios Bridge
    Android?: AndroidBridge;
  }
}

const isAndroidBridgeAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'Android' in window;
};

// Get private key from Android bridge or prompt user
const getPrivateKeyFromAndroidBridge = async (): Promise<string | null> => {
  if (!isAndroidBridgeAvailable()) {
    return null;
  }

  try {
    const privateKey = await window.Android!.getPrivateKey();

    // Validate the returned private key
    if (typeof privateKey !== 'string' || privateKey.length === 0) {
      throw new Error('Invalid private key received from Android bridge');
    }

    return privateKey;
  } catch (error) {
    console.error('Failed to get private key from Android bridge:', error);
    return null;
  }
};

// Prompt user for private key input
const promptUserForPrivateKey = async (): Promise<string | null> => {
  // TODO: Implement secure key input mechanism
  throw new Error('Secure key input not yet implemented for web');
};

// Get private key from Android bridge or prompt user
const getPrivateKey = async (): Promise<string | null> => {
  // Try Android bridge first
  const key = await getPrivateKeyFromAndroidBridge();
  if (key) {
    return key;
  }
  return promptUserForPrivateKey();
};

/*
 * This function is not implemented yet
 * and is only a placeholder for the web implementation.
 * it doesnt do anything
 */
const _getSecurely = async function <T>(
  fn: () => Promise<string | false>,
  formatter: (dataString: string) => T,
): Promise<SignedPayload<T> | null> {
  console.log('Starting _getSecurely (web)');

  console.warn(
    'This is a stub for _getSecurely on web. It does not implement secure storage or biometric authentication.',
  );
  const dataString = await fn();
  console.log('Got data string:', dataString ? 'exists' : 'not found');

  if (dataString === false) {
    console.log('No data string available');
    return null;
  }

  try {
    // For web, we need to figure out exactly how this will interact with the
    // Android bridge or any other secure storage mechanism.
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

async function checkBiometricsAvailable(): Promise<boolean> {
  // On web, biometrics are not available in the same way as mobile
  // We'll return false to indicate biometrics are not available
  trackEvent(AuthEvents.BIOMETRIC_CHECK, { available: false });
  return false;
}

async function restoreFromMnemonic(_mnemonic: string): Promise<string | false> {
  // No-op on web since we don't have access to mnemonics
  console.log('restoreFromMnemonic: No-op on web');
  trackEvent(AuthEvents.MNEMONIC_RESTORE_FAILED, {
    reason: 'not_supported_on_web',
  });
  return false;
}

async function loadOrCreateMnemonic(): Promise<string | false> {
  // No-op on web since we don't have access to mnemonics
  console.log('loadOrCreateMnemonic: No-op on web');
  return false;
}

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

    // On web, we'll simulate biometric authentication by checking if we can get the private key
    const promise = (async () => {
      try {
        const privateKey = await getPrivateKey();
        if (privateKey) {
          return { success: true };
        } else {
          return { success: false, error: 'No private key provided' };
        }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })();

    setIsAuthenticatingPromise(promise);
    const { success, error } = await promise;

    if (error) {
      setIsAuthenticatingPromise(null);
      trackEvent(AuthEvents.BIOMETRIC_LOGIN_FAILED, { error });
      throw new Error(error);
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
  }, [isAuthenticatingPromise, authenticationTimeoutinMs]);

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
      isAuthenticated,
      isAuthenticatingPromise,
      loginWithBiometrics,
      getOrCreateMnemonic,
      restoreAccountFromMnemonic,
    ],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export async function hasSecretStored() {
  // TODO implement a way to check if the private key is stored
  return true;
}

export async function migrateToSecureKeychain(): Promise<boolean> {
  console.warn('migrateToSecureKeychain is not implemented for web');
  return false;
}

export async function unsafe_clearSecrets() {
  if (__DEV__) {
    console.warn('unsafe_clearSecrets is not implemented for web');
    // In a real implementation, you would clear any stored secrets here
  }
}

/**
 * The only reason this is exported without being locked behind user biometrics is to allow `loadPassportDataAndSecret`
 * to access both the privatekey and the passport data with the user only authenticating once
 */
export async function unsafe_getPrivateKey() {
  return getPrivateKey();
}

export const useAuth = () => {
  return useContext(AuthContext);
};
