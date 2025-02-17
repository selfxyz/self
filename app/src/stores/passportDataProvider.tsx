import { PassportData } from '../../../common/src/utils/types';
import { loadSecretOrCreateIt, useAuth } from '../stores/authProvider';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Keychain from 'react-native-keychain';

export async function loadPassportData() {
  const passportDataCreds = await Keychain.getGenericPassword({
    service: 'passportData',
  });
  return passportDataCreds === false ? false : passportDataCreds.password;
}

export async function loadPassportDataAndSecret() {
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

export async function clearPassportData() {
  await Keychain.resetGenericPassword({ service: 'passportData' });
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
  clearPassportData: () => Promise<void>;
}

export const PassportContext = createContext<IPassportContext>({
  getData: () => Promise.resolve(null),
  setData: storePassportData,
  getPassportDataAndSecret: () => Promise.resolve(null),
  clearPassportData: clearPassportData,
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
      clearPassportData: clearPassportData,
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
