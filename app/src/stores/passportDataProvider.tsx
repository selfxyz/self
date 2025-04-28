import { ethers, type Mnemonic } from 'ethers';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Keychain from 'react-native-keychain';

import type { PassportData } from '../../../common/src/utils/types';

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
  mnemonic: Mnemonic | null;
  status: Status;
  secret: string | null;
  setPassportData: (data: PassportData) => Promise<void>;
  clearPassportData: () => Promise<void>;
  setMnemonic: () => Promise<Mnemonic | null>;
  restorefromSecret: (mnemonic: string) => Promise<string>;
  unsafe_clearSecrets: () => Promise<void>;
}

const PassportContext = createContext<IPassportContext>({
  passportData: null,
  mnemonic: null,
  status: 'idle',
  secret: null,
  setPassportData: () => Promise.resolve(),
  clearPassportData: () => Promise.resolve(),
  setMnemonic: () => Promise.resolve(null),
  restorefromSecret: () => Promise.resolve(''),
  unsafe_clearSecrets: () => Promise.resolve(),
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const [status, setStatus] = useState<Status>('idle');
  const [passportCache, setPasspotCache] = useState<PassportData | null>(null);
  const [mnemonicCache, setMnemonicCache] = useState<Mnemonic | null>(null);
  const getPassportDataFromKeychain = useCallback(async () => {
    const passportDataCreds = await Keychain.getGenericPassword({
      service: 'passportData',
    });
    if (!passportDataCreds) {
      return false;
    }
    return JSON.parse(passportDataCreds.password);
  }, []);

  const secret = useMemo(() => {
    if (mnemonicCache) {
      return ethers.HDNodeWallet.fromPhrase(mnemonicCache.phrase).privateKey;
    }
    return null;
  }, [mnemonicCache]);

  const getSecretDataFromKeyChain = useCallback(async () => {
    const storedMnemonic = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    if (storedMnemonic) {
      const parsed = JSON.parse(storedMnemonic.password);
      console.log('Stored mnemonic parsed successfully and saved in memory');
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
        const mnemonic =
          (await getSecretDataFromKeyChain()) || (await setMnemonic());
        if (mnemonic) {
          setMnemonicCache(mnemonic);
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

  const setMnemonic = useCallback(async () => {
    const { mnemonic } = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromEntropy(ethers.randomBytes(32)),
    );
    const data = JSON.stringify(mnemonic);
    await Keychain.setGenericPassword('secret', data, {
      service: SERVICE_NAME,
    });
    setMnemonicCache(mnemonic);
    return mnemonic;
  }, []);

  const clearPassportData = useCallback(async () => {
    await clearPassportDataFromKeychain();
    setPasspotCache(null);
  }, []);

  const restorefromSecret = useCallback(async (mnemonic: string) => {
    const data = await restoreFromMnemonic(mnemonic);
    if (!data) {
      throw new Error('Invalid mnemonic');
    }
    setMnemonicCache(data);
    return ethers.HDNodeWallet.fromPhrase(data.phrase).privateKey;
  }, []);

  const state: IPassportContext = useMemo(
    () => ({
      passportData: passportCache,
      secret,
      status,
      setPassportData,
      clearPassportData,
      restorefromSecret,
      setMnemonic,
      unsafe_clearSecrets,
      mnemonic: mnemonicCache,
    }),
    [
      passportCache,
      mnemonicCache,
      status,
      setPassportData,
      clearPassportData,
      restorefromSecret,
      setMnemonic,
      secret,
    ],
  );

  return (
    <PassportContext.Provider value={state}>
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = () => {
  const c = useContext(PassportContext);
  if (!c) {
    throw new Error('usePassport must be used within a PassportProvider');
  }
  return c;
};
