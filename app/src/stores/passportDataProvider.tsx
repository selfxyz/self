import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Keychain from 'react-native-keychain';

import { PassportData } from '../../../common/src/utils/types';
import { loadSecretOrCreateIt } from '../stores/authProvider';
import { useAuth } from './authProvider';

async function loadPassportData() {
  const passportDataCreds = await Keychain.getGenericPassword({
    service: 'passportData',
  });
  return passportDataCreds === false ? false : passportDataCreds.password;
}

async function loadPassportDataAndSecret() {
  const passportData = await loadPassportData();
  const secret = await loadSecretOrCreateIt();
  if (!secret || !passportData) {
    return false;
  }
  return JSON.stringify({
    secret,
    passportData: JSON.parse(passportData),
  });
}

export async function storePassportData(passportData: PassportData) {
  await Keychain.setGenericPassword(
    'passportData',
    JSON.stringify(passportData),
    { service: 'passportData' },
  );
}

interface PassportProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IPassportContext {
  getData: () => Promise<{ signature: string; data: PassportData } | null>;
  setData: (data: PassportData) => Promise<void>;
  getPassportDataAndSecret: () => Promise<{
    data: { passportData: PassportData; secret: string };
    signature: string;
  } | null>;
}

export const PassportContext = createContext<IPassportContext>({
  getData: () => Promise.resolve(null),
  setData: storePassportData,
  getPassportDataAndSecret: () => Promise.resolve(null),
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const { _getSecurely } = useAuth();

  const getData = useCallback(
    () => _getSecurely<PassportData>(loadPassportData, str => JSON.parse(str)),
    [_getSecurely],
  );

  const getPassportDataAndSecret = useCallback(
    () =>
      _getSecurely<{ passportData: PassportData; secret: string }>(
        loadPassportDataAndSecret,
        str => JSON.parse(str),
      ),
    [_getSecurely],
  );

  const state: IPassportContext = useMemo(
    () => ({
      getData,
      setData: storePassportData,
      getPassportDataAndSecret,
    }),
    [getData, getPassportDataAndSecret],
  );

  return (
    <PassportContext.Provider value={state}>
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = () => {
  return useContext(PassportContext);
};
