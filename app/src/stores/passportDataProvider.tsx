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

import { unsafe_getPrivateKey } from '../stores/authProvider';
import { useAuth } from './authProvider';
import useUserStore from './userStore';

function getServiceNameForDocumentType(documentType: string): string {
  switch (documentType) {
    case 'passport':
      return 'passportData';
    case 'mock_passport':
      return 'mockPassportData';
    case 'id_card':
      return 'idCardData';
    case 'mock_id_card':
      return 'mockIdCardData';
    default:
      return 'passportData';
  }
}

function getDocumentTypeFromServiceName(serviceName: string): string {
  switch (serviceName) {
    case 'passportData':
      return 'passport';
    case 'mockPassportData':
      return 'mock_passport';
    case 'idCardData':
      return 'id_card';
    case 'mockIdCardData':
      return 'mock_id_card';
    default:
      return 'passport';
  }
}

export async function loadPassportData() {
  const services = [
    'passportData',
    'mockPassportData',
    'idCardData',
    'mockIdCardData',
  ];

  for (const service of services) {
    const passportDataCreds = await Keychain.getGenericPassword({
      service,
    });
    if (passportDataCreds !== false) {
      return passportDataCreds.password;
    }
  }

  return false;
}

export async function loadSelectedPassportData(
  selectedDocumentType: string,
): Promise<string | false> {
  if (selectedDocumentType) {
    const serviceName = getServiceNameForDocumentType(selectedDocumentType);
    const passportDataCreds = await Keychain.getGenericPassword({
      service: serviceName,
    });
    if (passportDataCreds !== false) {
      return passportDataCreds.password;
    }
  }

  return await loadPassportData();
}

export async function loadSelectedPassportDataAndSecret(
  selectedDocumentType: string,
) {
  const passportData = await loadSelectedPassportData(selectedDocumentType);
  const secret = await unsafe_getPrivateKey();
  if (!secret || !passportData) {
    return false;
  }
  return JSON.stringify({
    secret,
    passportData: JSON.parse(passportData),
  });
}

export async function loadAllPassportData(): Promise<{
  [service: string]: PassportData;
}> {
  const services = [
    'passportData',
    'mockPassportData',
    'idCardData',
    'mockIdCardData',
  ];
  const allData: { [service: string]: PassportData } = {};

  for (const service of services) {
    try {
      const passportDataCreds = await Keychain.getGenericPassword({
        service,
      });
      if (passportDataCreds !== false) {
        allData[service] = JSON.parse(passportDataCreds.password);
      }
    } catch (error) {
      console.log(`Could not load data from service ${service}:`, error);
    }
  }

  return allData;
}

export async function getAvailableDocumentTypes(): Promise<string[]> {
  const allData = await loadAllPassportData();
  return Object.keys(allData).map(service =>
    getDocumentTypeFromServiceName(service),
  );
}

export async function setDefaultDocumentTypeIfNeeded() {
  const { selectedDocumentType, setSelectedDocumentType } =
    useUserStore.getState();

  if (!selectedDocumentType) {
    const availableTypes = await getAvailableDocumentTypes();
    if (availableTypes.length > 0) {
      setSelectedDocumentType(availableTypes[0]);
    }
  }
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
  const serviceName = getServiceNameForDocumentType(passportData.documentType);
  await Keychain.setGenericPassword(serviceName, JSON.stringify(passportData), {
    service: serviceName,
  });
  useUserStore.getState().setSelectedDocumentType(passportData.documentType);
}

export async function clearPassportData() {
  const services = [
    'passportData',
    'mockPassportData',
    'idCardData',
    'mockIdCardData',
  ];

  for (const service of services) {
    try {
      await Keychain.resetGenericPassword({ service });
    } catch (error) {
      console.log(`Service ${service} not found or already cleared`);
    }
  }
}

export async function clearSpecificPassportData(documentType: string) {
  const serviceName = getServiceNameForDocumentType(documentType);
  try {
    await Keychain.resetGenericPassword({ service: serviceName });
  } catch (error) {
    console.log(`Service ${serviceName} not found or already cleared`);
  }
}

interface PassportProviderProps extends PropsWithChildren {
  authenticationTimeoutinMs?: number;
}
interface IPassportContext {
  getData: () => Promise<{ signature: string; data: PassportData } | null>;
  getSelectedData: () => Promise<{
    signature: string;
    data: PassportData;
  } | null>;
  getAllData: () => Promise<{ [service: string]: PassportData }>;
  getAvailableTypes: () => Promise<string[]>;
  setData: (data: PassportData) => Promise<void>;
  getPassportDataAndSecret: () => Promise<{
    data: { passportData: PassportData; secret: string };
    signature: string;
  } | null>;
  getSelectedPassportDataAndSecret: () => Promise<{
    data: { passportData: PassportData; secret: string };
    signature: string;
  } | null>;
  clearPassportData: () => Promise<void>;
  clearSpecificData: (documentType: string) => Promise<void>;
}

export const PassportContext = createContext<IPassportContext>({
  getData: () => Promise.resolve(null),
  getSelectedData: () => Promise.resolve(null),
  getAllData: () => Promise.resolve({}),
  getAvailableTypes: () => Promise.resolve([]),
  setData: storePassportData,
  getPassportDataAndSecret: () => Promise.resolve(null),
  getSelectedPassportDataAndSecret: () => Promise.resolve(null),
  clearPassportData: clearPassportData,
  clearSpecificData: clearSpecificPassportData,
});

export const PassportProvider = ({ children }: PassportProviderProps) => {
  const { _getSecurely } = useAuth();

  const getData = useCallback(
    () => _getSecurely<PassportData>(loadPassportData, str => JSON.parse(str)),
    [_getSecurely],
  );

  const getSelectedData = useCallback(
    () =>
      _getSecurely<PassportData>(loadSelectedPassportData, str =>
        JSON.parse(str),
      ),
    [_getSecurely],
  );

  const getAllData = useCallback(() => loadAllPassportData(), []);

  const getAvailableTypes = useCallback(() => getAvailableDocumentTypes(), []);

  const getPassportDataAndSecret = useCallback(
    () =>
      _getSecurely<{ passportData: PassportData; secret: string }>(
        loadPassportDataAndSecret,
        str => JSON.parse(str),
      ),
    [_getSecurely],
  );

  const getSelectedPassportDataAndSecret = useCallback(
    () =>
      _getSecurely<{ passportData: PassportData; secret: string }>(
        loadSelectedPassportDataAndSecret,
        str => JSON.parse(str),
      ),
    [_getSecurely],
  );

  const state: IPassportContext = useMemo(
    () => ({
      getData,
      getSelectedData,
      getAllData,
      getAvailableTypes,
      setData: storePassportData,
      getPassportDataAndSecret,
      getSelectedPassportDataAndSecret,
      clearPassportData: clearPassportData,
      clearSpecificData: clearSpecificPassportData,
    }),
    [
      getData,
      getSelectedData,
      getAllData,
      getAvailableTypes,
      getPassportDataAndSecret,
      getSelectedPassportDataAndSecret,
    ],
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

      passportData.csca_parsed = cscaParsed;

      await storePassportData(passportData);
    }
  }
}
