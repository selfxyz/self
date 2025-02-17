import { PassportData } from '../../../common/src/utils/types';
import '@react-navigation/native';
import { Buffer } from 'buffer';
import { NativeModules, Platform } from 'react-native';
import PassportReader from 'react-native-passport-reader';

interface Inputs {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

export const scan = async (inputs: Inputs) => {
  return Platform.OS === 'android'
    ? await scanAndroid(inputs)
    : await scanIOS(inputs);
};

const scanAndroid = async (inputs: Inputs) => {
  return await PassportReader.scan({
    documentNumber: inputs.passportNumber,
    dateOfBirth: inputs.dateOfBirth,
    dateOfExpiry: inputs.dateOfExpiry,
  });
};

const scanIOS = async (inputs: Inputs) => {
  return await NativeModules.PassportReader.scanPassport(
    inputs.passportNumber,
    inputs.dateOfBirth,
    inputs.dateOfExpiry,
  );
};

export const parseScanResponse = (response: any) => {
  return Platform.OS === 'android'
    ? handleResponseAndroid(response)
    : handleResponseIOS(response);
};

const handleResponseIOS = (response: any) => {
  const parsed = JSON.parse(response);
  const dgHashesObj = JSON.parse(parsed?.dataGroupHashes);
  const dg1HashString = dgHashesObj?.DG1?.sodHash;
  const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'));
  const dg2HashString = dgHashesObj?.DG2?.sodHash;
  const dg2Hash = Array.from(Buffer.from(dg2HashString, 'hex'));

  const eContentBase64 = parsed?.eContentBase64;
  const signedAttributes = parsed?.signedAttributes;
  const mrz = parsed?.passportMRZ;
  const signatureBase64 = parsed?.signatureBase64;
  const _dataGroupsPresent = parsed?.dataGroupsPresent;
  const _placeOfBirth = parsed?.placeOfBirth;
  const _activeAuthenticationPassed = parsed?.activeAuthenticationPassed;
  const _isPACESupported = parsed?.isPACESupported;
  const _isChipAuthenticationSupported = parsed?.isChipAuthenticationSupported;
  const _residenceAddress = parsed?.residenceAddress;
  const passportPhoto = parsed?.passportPhoto;
  const _encapsulatedContentDigestAlgorithm =
    parsed?.encapsulatedContentDigestAlgorithm;
  const documentSigningCertificate = parsed?.documentSigningCertificate;
  const pem = JSON.parse(documentSigningCertificate).PEM.replace(/\n/g, '');
  const eContentArray = Array.from(Buffer.from(signedAttributes, 'base64'));
  const signedEContentArray = eContentArray.map(byte =>
    byte > 127 ? byte - 256 : byte,
  );

  const concatenatedDataHashesArray = Array.from(
    Buffer.from(eContentBase64, 'base64'),
  );
  const concatenatedDataHashesArraySigned = concatenatedDataHashesArray.map(
    byte => (byte > 127 ? byte - 256 : byte),
  );

  const encryptedDigestArray = Array.from(
    Buffer.from(signatureBase64, 'base64'),
  ).map(byte => (byte > 127 ? byte - 256 : byte));

  return {
    mrz,
    dsc: pem,
    dg2Hash: dg2Hash,
    dg1Hash: dg1Hash,
    dgPresents: parsed?.dataGroupsPresent,
    eContent: concatenatedDataHashesArraySigned,
    signedAttr: signedEContentArray,
    encryptedDigest: encryptedDigestArray,
    parsed: false,
  };
};

const handleResponseAndroid = (response: any) => {
  const {
    mrz,
    eContent,
    encryptedDigest,
    _photo,
    _digestAlgorithm,
    _signerInfoDigestAlgorithm,
    _digestEncryptionAlgorithm,
    _LDSVersion,
    _unicodeVersion,
    encapContent,
    documentSigningCertificate,
    dataGroupHashes,
  } = response;

  const dgHashesObj = JSON.parse(dataGroupHashes);
  const dg1HashString = dgHashesObj['1'];
  const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'));
  const dg2Hash = dgHashesObj['2'];
  const pem =
    '-----BEGIN CERTIFICATE-----' +
    documentSigningCertificate +
    '-----END CERTIFICATE-----';

  const dgPresents = Object.keys(dgHashesObj)
    .map(key => parseInt(key)) // eslint-disable-line radix
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  return {
    mrz: mrz.replace(/\n/g, ''),
    dsc: pem,
    dg2Hash,
    dg1Hash,
    dgPresents,
    eContent: JSON.parse(encapContent),
    signedAttr: JSON.parse(eContent),
    encryptedDigest: JSON.parse(encryptedDigest),
  } as PassportData;
};
