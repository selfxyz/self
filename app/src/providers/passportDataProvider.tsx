import { PublicKeyDetailsECDSA, PublicKeyDetailsRSA } from '@selfxyz/common';
import { parseCertificateSimple } from '@selfxyz/common';
import { brutforceSignatureAlgorithmDsc } from '@selfxyz/common';
import { PassportData } from '@selfxyz/common';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import Keychain from 'react-native-keychain';

import { unsafe_getPrivateKey } from '../providers/authProvider';
import { useAuth } from './authProvider';

// TODO: refactor this as it shouldnt be used directly IMHO
export async function loadPassportData() {
  const passportDataCreds = await Keychain.getGenericPassword({
    service: 'passportData',
  });
  return passportDataCreds === false ? false : passportDataCreds.password;
}

export async function loadPassportDataAndSecret() {
  const passportData = await loadPassportData();
  const secret = await unsafe_getPrivateKey();
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

export async function reStorePassportDataWithRightCSCA(
  passportData: PassportData,
  csca: string,
) {
  const cscaInCurrentPassporData = passportData.passportMetadata?.csca;
  if (!(csca === cscaInCurrentPassporData)) {
    const cscaParsed = parseCertificateSimple(csca);
    const dscCertData = brutforceSignatureAlgorithmDsc(
      passportData.dsc_parsed!,
      cscaParsed,
    );

    // Update the passport metadata with the new CSCA information
    if (
      passportData.passportMetadata &&
      dscCertData &&
      cscaParsed.publicKeyDetails
    ) {
      passportData.passportMetadata.csca = csca;
      passportData.passportMetadata.cscaFound = true;
      passportData.passportMetadata.cscaHashFunction =
        dscCertData.hashAlgorithm;
      passportData.passportMetadata.cscaSignatureAlgorithm =
        dscCertData.signatureAlgorithm;
      passportData.passportMetadata.cscaSaltLength = dscCertData.saltLength;

      // Get curve or exponent from the parsed CSCA
      const cscaCurveOrExponent =
        cscaParsed.signatureAlgorithm === 'rsapss' ||
        cscaParsed.signatureAlgorithm === 'rsa'
          ? (cscaParsed.publicKeyDetails as PublicKeyDetailsRSA).exponent
          : (cscaParsed.publicKeyDetails as PublicKeyDetailsECDSA).curve;

      passportData.passportMetadata.cscaCurveOrExponent = cscaCurveOrExponent;
      passportData.passportMetadata.cscaSignatureAlgorithmBits = parseInt(
        cscaParsed.publicKeyDetails.bits,
        10,
      );

      // Store the parsed CSCA certificate in the passport data
      passportData.csca_parsed = cscaParsed;

      // Store the updated passport data

      await storePassportData(passportData);
    }
  }
}
