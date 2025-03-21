import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Keychain from 'react-native-keychain';

import { type Mnemonic, ethers } from 'ethers';

import type { PassportData } from '../../../common/src/utils/types';
import { useAuth } from '../stores/authProvider';

const password = 'passportData';
const SERVICE_NAME = 'secret';

export async function hasSecretStored() {
  const seed = await Keychain.getGenericPassword({ service: SERVICE_NAME });
  return !!seed;
}

async function storePassportDataInKeychain(passportData: PassportData) {
  await Keychain.setGenericPassword(password, JSON.stringify(passportData), {
    service: 'passportData',
  });
}

async function clearPassportDataFromKeychain() {
  await Keychain.resetGenericPassword({ service: 'passportData' });
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
  return restoredWallet.mnemonic;
}
async function unsafe_clearSecrets() {
  if (__DEV__) {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
  }
}

interface PassportProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}

type Status = 'idle' | 'initializing' | 'updating' | 'error' | 'success';
interface IPassportContext {
  passportData: PassportData | null;
  secret: Mnemonic | null;
  status: Status;
  unsafe_secret_privateKey?: string;
  setPassportData: (data: PassportData) => Promise<void>;
  clearPassportData: () => Promise<void>;
  setSecret: () => Promise<Mnemonic | null>;
  restorefromSecret: (mnemonic: string) => Promise<Mnemonic | null>;
  unsafe_clearSecrets: () => Promise<void>;
}

const PassportContext = createContext<IPassportContext>({
  passportData: null,
  secret: null,
  status: 'idle',
  setPassportData: () => Promise.resolve(),
  clearPassportData: () => Promise.resolve(),
  setSecret: () => Promise.resolve(null),
  restorefromSecret: () => Promise.resolve(null),
  unsafe_clearSecrets: () => Promise.resolve(),
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const [status, setStatus] = useState<Status>('idle');
  const [passportCache, setPasspotCache] = useState<PassportData | null>(null);
  const [secretCache, setSecretCache] = useState<Mnemonic | null>(null);
  const [unsafePrivateKey, setUnsafePrivateKey] = useState<string>();
  const getPassportDataFromKeychain = useCallback(async () => {
    const passportDataCreds = await Keychain.getGenericPassword({
      service: 'passportData',
    });
    if (!passportDataCreds) {
      return false;
    }
    return JSON.parse(passportDataCreds.password);
  }, []);

  const getSecretDataFromKeyChain = useCallback(async () => {
    const storedMnemonic = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    if (storedMnemonic) {
      const parsed = JSON.parse(storedMnemonic.password);
      console.log('Stored mnemonic parsed successfully');
      return parsed as Mnemonic;
    }
  }, []);

  const isPassportNull = useMemo(() => !passportCache, [passportCache]);

  useEffect(() => {
    (async () => {
      setStatus(isPassportNull ? 'initializing' : 'updating');
      try {
        const passportData = await getPassportDataFromKeychain();
        if (passportData) {
          setPasspotCache(passportData);
        }
        const secret =
          (await getSecretDataFromKeyChain()) || (await setSecret());
        if (secret) {
          setSecretCache(secret);
        }
        setStatus('success');
      } catch (error) {
        console.error(
          'Error fetching passport data or secret from keychain:',
          error,
        );
        setStatus('error');
      }
    })();
  }, [getPassportDataFromKeychain, getSecretDataFromKeyChain, isPassportNull]);

  const setPassportData = useCallback(async (data: PassportData) => {
    await storePassportDataInKeychain(data);
    setPasspotCache(data);
  }, []);

  const setSecret = useCallback(async () => {
    const { mnemonic, privateKey } = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromEntropy(ethers.randomBytes(32)),
    );
    setUnsafePrivateKey(privateKey);
    const data = JSON.stringify(mnemonic);
    await Keychain.setGenericPassword('secret', data, {
      service: SERVICE_NAME,
    });
    setSecretCache(mnemonic);
    return mnemonic;
  }, []);

  const clearPassportData = useCallback(async () => {
    await clearPassportDataFromKeychain();
    setPasspotCache(null);
  }, []);

  const restorefromSecret = useCallback(async (mnemonic: string) => {
    const data = await restoreFromMnemonic(mnemonic);
    setSecretCache(data);
    return data;
  }, []);

  const state: IPassportContext = useMemo(
    () => ({
      passportData: passportCache,
      secret: secretCache,
      status,
      setPassportData,
      clearPassportData,
      restorefromSecret,
      setSecret,
      unsafe_clearSecrets,
      unsafe_secret_privateKey: unsafePrivateKey,
    }),
    [
      passportCache,
      secretCache,
      status,
      setPassportData,
      clearPassportData,
      restorefromSecret,
      setSecret,
      unsafePrivateKey,
    ],
  );

  return (
    <PassportContext.Provider value={state}>
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = (auth = true) => {
  const c = useContext(PassportContext);
  if (!c) {
    throw new Error('usePassport must be used within a PassportProvider');
  }

  const { isAuthenticated, isAuthenticating, loginWithBiometrics } = useAuth();
  useEffect(() => {
    if (!isAuthenticated && !isAuthenticating && auth) {
      loginWithBiometrics();
    }
  }, [isAuthenticated, loginWithBiometrics, auth, isAuthenticating]);

  return c;
};
