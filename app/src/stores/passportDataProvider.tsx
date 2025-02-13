import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Keychain from 'react-native-keychain';

import { PassportMetadata } from '../../../common/src/utils/passports/passport_parsing/parsePassportData';
import { PassportData } from '../../../common/src/utils/types';
import { useAuth } from './authProvider';

async function loadPassportData() {
  const passportDataCreds = await Keychain.getGenericPassword({
    service: 'passportData',
  });
  return passportDataCreds === false ? false : passportDataCreds.password;
}
async function storePassportData(passportData: PassportData) {
  await Keychain.setGenericPassword(
    'passportData',
    JSON.stringify(passportData),
    { service: 'passportData' },
  );
}
async function loadPassportMetadata() {
  const metadataCreds = await Keychain.getGenericPassword({
    service: 'passportMetadata',
  });
  return metadataCreds === false ? false : metadataCreds.password;
}
async function storePassportMetadata(metadata: PassportMetadata) {
  await Keychain.setGenericPassword(
    'passportMetadata',
    JSON.stringify(metadata),
    { service: 'passportMetadata' },
  );
}

interface PassportProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IPassportContext {
  getData: () => Promise<{ signature: string; data: PassportData } | null>;
  setData: (data: PassportData) => Promise<void>;
  getMetadata: () => Promise<{
    signature: string;
    data: PassportMetadata;
  } | null>;
  setMetadata: (metadata: PassportMetadata) => Promise<void>;
}

export const PassportContext = createContext<IPassportContext>({
  getData: () => Promise.resolve(null),
  getMetadata: () => Promise.resolve(null),
  setData: storePassportData,
  setMetadata: storePassportMetadata,
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const { _getSecurely } = useAuth();

  const getData = useCallback(
    () => _getSecurely<PassportData>(loadPassportData, str => JSON.parse(str)),
    [_getSecurely],
  );

  const getMetadata = useCallback(
    () =>
      _getSecurely<PassportMetadata>(loadPassportMetadata, str =>
        JSON.parse(str),
      ),
    [_getSecurely],
  );

  const state: IPassportContext = useMemo(
    () => ({
      getData,
      getMetadata,
      setData: storePassportData,
      setMetadata: storePassportMetadata,
    }),
    [getData, getMetadata],
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
