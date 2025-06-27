// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { AuthEvents } from '../consts/analytics';
import { Mnemonic } from '../types/mnemonic';
import analytics from '../utils/analytics';

const { trackEvent } = analytics();

type SignedPayload<T> = { signature: string; data: T };

// In-memory storage for web (not secure, but better than sessionStorage)
let inMemorySecret: string | null = null;

// Check if Android bridge is available
const isAndroidBridgeAvailable = (): boolean => {
  return typeof window !== 'undefined' && 'Android' in window;
};

// Get private key from Android bridge or prompt user
const getPrivateKeyFromAndroidBridge = async (): Promise<string | null> => {
  if (!isAndroidBridgeAvailable()) {
    return null;
  }

  try {
    // Assuming the Android bridge exposes a method to get the private key
    // This would need to be implemented on the Android side
    const privateKey = await (window as any).Android.getPrivateKey();
    return privateKey;
  } catch (error) {
    console.error('Failed to get private key from Android bridge:', error);
    return null;
  }
};

// Prompt user for private key input
const promptUserForPrivateKey = async (): Promise<string | null> => {
  return new Promise(resolve => {
    const privateKey = prompt('Please enter your private key:');
    if (privateKey && privateKey.trim()) {
      resolve(privateKey.trim());
    } else {
      resolve(null);
    }
  });
};

// Get private key from Android bridge or prompt user
const getPrivateKey = async (): Promise<string | null> => {
  // Try Android bridge first
  inMemorySecret = await getPrivateKeyFromAndroidBridge();
  if (inMemorySecret) {
    return inMemorySecret;
  }

  // Fall back to user prompt
  return (inMemorySecret = await promptUserForPrivateKey());
};

const _getSecurely = async function <T>(
  fn: () => Promise<string | false>,
  formatter: (dataString: string) => T,
): Promise<SignedPayload<T> | null> {
  console.log('Starting _getSecurely (web)');

  const dataString = await fn();
  console.log('Got data string:', dataString ? 'exists' : 'not found');

  if (dataString === false) {
    console.log('No data string available');
    return null;
  }

  try {
    // For web, we consider the user authenticated if they can provide the private key
    // This is a simplified approach - in a real implementation you might want more security
    trackEvent(AuthEvents.BIOMETRIC_AUTH_SUCCESS);
    return {
      signature: 'authenticated',
      data: formatter(dataString),
    };
  } catch (error: any) {
    console.error('Error in _getSecurely:', error);
    trackEvent(AuthEvents.BIOMETRIC_AUTH_FAILED, {
      reason: 'unknown_error',
      error: error.message,
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
      } catch (error: any) {
        return { success: false, error: error.message };
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

export const useAuth = () => {
  return useContext(AuthContext);
};

export async function hasSecretStored() {
  // Check in-memory storage for web
  return !!inMemorySecret;
}

/**
 * The only reason this is exported without being locked behind user biometrics is to allow `loadPassportDataAndSecret`
 * to access both the privatekey and the passport data with the user only authenticating once
 */
export async function unsafe_getPrivateKey() {
  return inMemorySecret;
}

export async function unsafe_clearSecrets() {
  if (__DEV__) {
    inMemorySecret = null;
  }
}
