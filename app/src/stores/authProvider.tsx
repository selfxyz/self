import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';
import Keychain from 'react-native-keychain';

import { ethers } from 'ethers';

import { Mnemonic } from '../types/mnemonic';

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

  const result = await biometrics.createSignature({
    payload: dataString,
    promptMessage: 'Allow access to identity',
    // @ts-expect-error
    allowDeviceCredentials: true,
  });
  const { error, success, signature } = result;
  if (error) {
    // handle error
    console.log(result, error, success, signature);
    throw error;
  }
  if (!success) {
    // user canceled
    throw new Error('Canceled by user');
  }

  return {
    signature: signature!,
    data: formatter(dataString),
  };
};

async function createSigningKeyPair(): Promise<boolean> {
  const { available } = await biometrics.isSensorAvailable();
  if (!available) {
    return false;
  }

  if ((await biometrics.biometricKeysExist()).keysExist) {
    return true;
  }
  console.log('No enrolled public key. Creating a public key from biometrics');
  try {
    await biometrics.createKeys();
    return true;
  } catch (e) {
    if (available) {
      console.error(
        "User has biometrics but somehow it wasn't able to create keys",
      );
      return false;
    } else {
      throw e;
    }
  }
}

async function restoreFromMnemonic(mnemonic: string) {
  if (!mnemonic || !ethers.Mnemonic.isValidMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  const restoredWallet = ethers.Wallet.fromPhrase(mnemonic);
  const data = JSON.stringify(restoredWallet.mnemonic);
  await Keychain.setGenericPassword('secret', data, {
    service: SERVICE_NAME,
  });
  return data;
}

async function loadOrCreateMnemonic() {
  const storedMnemonic = await Keychain.getGenericPassword({
    service: SERVICE_NAME,
  });
  if (storedMnemonic) {
    return storedMnemonic.password;
  }

  console.log('No secret found, creating one');
  const { mnemonic } = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromEntropy(ethers.randomBytes(32)),
  );
  const data = JSON.stringify(mnemonic);
  await Keychain.setGenericPassword('secret', data, {
    service: SERVICE_NAME,
  });
  return data;
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
  createSigningKeyPair: () => Promise<boolean>;
}
export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isAuthenticating: false,
  loginWithBiometrics: () => Promise.resolve(),
  _getSecurely,
  getOrCreateMnemonic: () => Promise.resolve(null),
  restoreAccountFromMnemonic: () => Promise.resolve(null),
  createSigningKeyPair: () => Promise.resolve(false),
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

    const promise = biometrics.simplePrompt({
      promptMessage: 'Confirm your identity to access the stored secret',
    });
    setIsAuthenticatingPromise(promise);
    const { success, error } = await promise;
    if (error) {
      setIsAuthenticatingPromise(null);
      // handle error
      throw error;
    }
    if (!success) {
      // user canceled
      throw new Error('Canceled by user');
    }

    setIsAuthenticatingPromise(null);
    setIsAuthenticated(true);
    setAuthenticatedTimeout(previousTimeout => {
      if (previousTimeout) {
        clearTimeout(previousTimeout);
      }
      return setTimeout(
        () => setIsAuthenticated(false),
        authenticationTimeoutinMs,
      );
    });
  }, [isAuthenticatingPromise]);

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
      createSigningKeyPair,
      _getSecurely,
    }),
    [isAuthenticated, isAuthenticatingPromise, loginWithBiometrics],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export async function hasSecretStored() {
  const seed = await Keychain.getGenericPassword({ service: SERVICE_NAME });
  return !!seed;
}

/**
 * The only reason this is exported without being locked behind user biometrics is to allow `loadPassportDataAndSecret`
 * to access both the privatekey and the passport data with the user only authenticating once
 */
export async function unsafe_getPrivateKey() {
  const mnemonic = JSON.parse(await loadOrCreateMnemonic()) as Mnemonic;
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic.phrase);
  return wallet.privateKey;
}

export async function unsafe_clearSecrets() {
  if (__DEV__) {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
  }
}
