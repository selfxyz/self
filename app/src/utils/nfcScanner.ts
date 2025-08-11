// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

/* eslint-disable @typescript-eslint/no-unused-vars */
import { Buffer } from 'buffer';
import { NativeModules, Platform } from 'react-native';
import PassportReader from 'react-native-passport-reader';
import { ENABLE_DEBUG_LOGS, MIXPANEL_NFC_PROJECT_TOKEN } from '@env';

import type { PassportData } from '@selfxyz/common/types';

interface AndroidScanResponse {
  mrz: string;
  eContent: string;
  encryptedDigest: string;
  _photo: string;
  _digestAlgorithm: string;
  _signerInfoDigestAlgorithm: string;
  _digestEncryptionAlgorithm: string;
  _LDSVersion: string;
  _unicodeVersion: string;
  encapContent: string;
  documentSigningCertificate: string;
  dataGroupHashes: string;
}

interface Inputs {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  canNumber?: string;
  useCan?: boolean;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
}

export const parseScanResponse = (response: unknown) => {
  return Platform.OS === 'android'
    ? handleResponseAndroid(response as AndroidScanResponse)
    : handleResponseIOS(response);
};

const scanAndroid = async (inputs: Inputs) => {
  PassportReader.reset();
  return await PassportReader.scan({
    documentNumber: inputs.passportNumber,
    dateOfBirth: inputs.dateOfBirth,
    dateOfExpiry: inputs.dateOfExpiry,
    canNumber: inputs.canNumber ?? '',
    useCan: inputs.useCan ?? false,
  });
};

const scanIOS = async (inputs: Inputs) => {
  return await NativeModules.PassportReader.scanPassport(
    inputs.passportNumber,
    inputs.dateOfBirth,
    inputs.dateOfExpiry,
    inputs.canNumber ?? '',
    inputs.useCan ?? false,
    inputs.skipPACE ?? false,
    inputs.skipCA ?? false,
    inputs.extendedMode ?? false,
    inputs.usePacePolling ?? false,
  );
};

export const scan = async (inputs: Inputs) => {
  if (MIXPANEL_NFC_PROJECT_TOKEN) {
    if (Platform.OS === 'ios') {
      const enableDebugLogs = JSON.parse(String(ENABLE_DEBUG_LOGS));
      NativeModules.PassportReader.configure(
        MIXPANEL_NFC_PROJECT_TOKEN,
        enableDebugLogs,
      );
    } else {
    }
  }

  return Platform.OS === 'android'
    ? await scanAndroid(inputs)
    : await scanIOS(inputs);
};

const handleResponseIOS = (response: unknown) => {
  const parsed = JSON.parse(String(response));
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

  const document_type = mrz.length === 88 ? 'passport' : 'id_card';

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
    documentType: document_type,
    mock: false,
    documentCategory: document_type,
  } as PassportData;
};

const handleResponseAndroid = (response: AndroidScanResponse): PassportData => {
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

  const mrz_clean = mrz.replace(/\n/g, '');
  const document_type = mrz_clean.length === 88 ? 'passport' : 'id_card';

  return {
    mrz: mrz_clean,
    dsc: pem,
    dg2Hash,
    dg1Hash,
    dgPresents,
    eContent: JSON.parse(encapContent),
    signedAttr: JSON.parse(eContent),
    encryptedDigest: JSON.parse(encryptedDigest),
    documentType: document_type,
    documentCategory: document_type,
    mock: false,
  };
};
