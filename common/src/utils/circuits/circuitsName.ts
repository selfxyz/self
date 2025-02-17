import { PassportData } from '../types';
import { parseCertificateSimple } from '../certificate_parsing/parseCertificateSimple';
import {
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
  PublicKeyDetailsRSAPSS,
} from '../certificate_parsing/dataStructure';

export function getCircuitNameFromPassportData(passportData: PassportData, circuitType: 'register' | 'dsc') {
  if (circuitType === 'register') {
    return getRegisterNameFromPassportData(passportData);
  } else {
    return getDSCircuitNameFromPassportData(passportData);
  }
}

function getDSCircuitNameFromPassportData(passportData: PassportData) {

  if (!passportData.passportMetadata) {
    throw new Error("Passport data are not parsed");
  }
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata.cscaFound) {
    throw new Error("CSCA not found");
  }
  const parsedCSCA = passportData.csca_parsed;
  const signatureAlgorithm = passportMetadata.cscaSignatureAlgorithm;
  const hashFunction = passportMetadata.cscaHashFunction;

  if (signatureAlgorithm === 'ecdsa') {
    const curve = (parsedCSCA.publicKeyDetails as PublicKeyDetailsECDSA).curve;
    return `dsc_${hashFunction}_${signatureAlgorithm}_${curve}`;
  } else if (signatureAlgorithm === 'rsa') {
    const exponent = (parsedCSCA.publicKeyDetails as PublicKeyDetailsRSA).exponent;
    const bits = (parsedCSCA.publicKeyDetails as PublicKeyDetailsRSA).bits;
    if (parseInt(bits) <= 4096) {
      return `dsc_${hashFunction}_${signatureAlgorithm}_${exponent}_${4096}`;
    } else {
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else if (parsedCSCA.signatureAlgorithm === 'rsapss') {
    const exponent = (parsedCSCA.publicKeyDetails as PublicKeyDetailsRSA).exponent;
    const saltLength = (parsedCSCA.publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength;
    const bits = (parsedCSCA.publicKeyDetails as PublicKeyDetailsRSAPSS).bits;
    if (parseInt(bits) <= 4096) {
      return `dsc_${hashFunction}_${signatureAlgorithm}_${exponent}_${saltLength}_${bits}`;
    } else {
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else {
    throw new Error('Unsupported signature algorithm');
  }

}

function getRegisterNameFromPassportData(passportData: PassportData) {
  if (!passportData.passportMetadata) {
    throw new Error("Passport data are not parsed");
  }
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata.cscaFound) {
    throw new Error("CSCA not found");
  }
  const parsedDsc = passportData.dsc_parsed;

  const dgHashAlgo = passportMetadata.dg1HashFunction;
  const eContentHashAlgo = passportMetadata.eContentHashFunction;
  const signedAttrHashAlgo = passportMetadata.signedAttrHashFunction;
  const sigAlg = passportMetadata.signatureAlgorithm;

  if (parsedDsc.signatureAlgorithm === 'ecdsa') {
    const curve = (parsedDsc.publicKeyDetails as PublicKeyDetailsECDSA).curve;
    return `register_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${curve}`;
  } else if (parsedDsc.signatureAlgorithm === 'rsa') {
    const exponent = (parsedDsc.publicKeyDetails as PublicKeyDetailsRSA).exponent;
    const bits = (parsedDsc.publicKeyDetails as PublicKeyDetailsRSA).bits;
    if (parseInt(bits) <= 4096) {
      return `register_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${exponent}_${4096}`;
    } else {
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else if (parsedDsc.signatureAlgorithm === 'rsapss') {
    const exponent = (parsedDsc.publicKeyDetails as PublicKeyDetailsRSA).exponent;
    const saltLength = (parsedDsc.publicKeyDetails as PublicKeyDetailsRSAPSS).saltLength;
    const bits = (parsedDsc.publicKeyDetails as PublicKeyDetailsRSAPSS).bits;
    if (parseInt(bits) <= 4096) {
      return `register_${dgHashAlgo}_${eContentHashAlgo}_${signedAttrHashAlgo}_${sigAlg}_${exponent}_${saltLength}_${bits}`;
    } else {
      throw new Error(`Unsupported key length: ${bits}`);
    }
  } else {
    throw new Error('Unsupported signature algorithm');
  }
}