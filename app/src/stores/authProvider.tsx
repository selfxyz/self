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

type SignedPayload<T> = { signature: string; data: T };
const _getSecurely = async function <T>(
  fn: () => Promise<string | false>,
  formatter: (dataString: string) => T,
): Promise<SignedPayload<T> | null> {
  const dataString = await fn();
  if (dataString === false) {
    return null;
  }

  let result: Awaited<ReturnType<typeof biometrics.createSignature>>;
  const args = {
    payload: dataString,
    promptMessage: 'Allow access to account private key',
  };
  try {
    result = await biometrics.createSignature(args);
  } catch (e) {
    console.log(
      'No enrolled public key. Creating a public key from biometrics',
    );
    await biometrics.createKeys();
    result = await biometrics.createSignature(args);
  }

  const { error, success, signature } = result;
  if (error) {
    // handle error
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

async function loadSecret() {
  const secretCreds = await Keychain.getGenericPassword({ service: 'secret' });
  return secretCreds === false ? false : secretCreds.password;
}

async function restoreFromMnemonic(mnemonic: string) {
  const restoredWallet = ethers.Wallet.fromPhrase(mnemonic);
  return restoreFromPrivateKey(restoredWallet.privateKey);
}

async function restoreFromPrivateKey(privateKey: string) {
  await Keychain.setGenericPassword('secret', privateKey, {
    service: 'secret',
  });
  return loadSecret();
}

async function loadSecretOrCreateIt() {
  const secret = await loadSecret();
  if (secret) {
    return secret;
  }

  console.log('No secret found, creating one');
  const randomWallet = ethers.Wallet.createRandom();
  const newSecret = randomWallet.privateKey;
  await Keychain.setGenericPassword('secret', newSecret, { service: 'secret' });
  return newSecret;
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
  getOrCreatePrivateKey: () => Promise<SignedPayload<string> | null>;
  restoreAccountFromMnemonic: (
    mnemonic: string,
  ) => Promise<SignedPayload<string> | null>;
  restoreAccountFromPrivateKey: (
    privKey: string,
  ) => Promise<SignedPayload<string> | null>;
}
export const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isAuthenticating: false,
  loginWithBiometrics: () => Promise.resolve(),
  _getSecurely,
  getOrCreatePrivateKey: () => Promise.resolve(null),
  restoreAccountFromMnemonic: () => Promise.resolve(null),
  restoreAccountFromPrivateKey: () => Promise.resolve(null),
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

  const getOrCreatePrivateKey = useCallback(
    () => _getSecurely<string>(loadSecretOrCreateIt, str => str),
    [],
  );

  const restoreAccountFromMnemonic = useCallback(
    (mnemonic: string) =>
      _getSecurely<string>(
        () => restoreFromMnemonic(mnemonic),
        str => str,
      ),
    [],
  );
  const restoreAccountFromPrivateKey = useCallback(
    (privKey: string) =>
      _getSecurely<string>(
        () => restoreFromPrivateKey(privKey),
        str => str,
      ),
    [],
  );

  const state: IAuthContext = useMemo(
    () => ({
      isAuthenticated,
      isAuthenticating: !!isAuthenticatingPromise,
      loginWithBiometrics,
      getOrCreatePrivateKey,
      restoreAccountFromMnemonic,
      restoreAccountFromPrivateKey,
      _getSecurely,
    }),
    [isAuthenticated, isAuthenticatingPromise, loginWithBiometrics],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
