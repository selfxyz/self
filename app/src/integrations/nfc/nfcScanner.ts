// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

import type { PassportData } from '@selfxyz/common/types';
import type { NFCScanContext } from '@selfxyz/mobile-sdk-alpha';

import { logNFCEvent } from '@/config/sentry';
import {
  type AndroidScanResponse,
  reset,
  scan as scanDocument,
} from '@/integrations/nfc/passportReader';
import { PassportReader } from '@/integrations/nfc/passportReader';

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
  sessionId: string;
  userId?: string;
  skipReselect?: boolean;
}

interface DataGroupHash {
  sodHash?: string;
  [key: string]: unknown;
}

export const parseScanResponse = (response: unknown) => {
  return Platform.OS === 'android'
    ? handleResponseAndroid(response as AndroidScanResponse)
    : handleResponseIOS(response);
};

export const scan = async (inputs: Inputs) => {
  const baseContext = {
    sessionId: inputs.sessionId,
    userId: inputs.userId,
    platform: Platform.OS as 'ios' | 'android',
    scanType: inputs.useCan ? 'can' : 'mrz',
  } as const;

  logNFCEvent('info', 'scan_start', { ...baseContext, stage: 'start' });

  try {
    return Platform.OS === 'android'
      ? await scanAndroid(inputs, baseContext)
      : await scanIOS(inputs, baseContext);
  } catch (error) {
    logNFCEvent(
      'error',
      'scan_failed',
      { ...baseContext, stage: 'scan' },
      {
        error: error instanceof Error ? error.message : String(error),
      },
    );
    throw error;
  }
};

const scanAndroid = async (
  inputs: Inputs,
  context: Omit<NFCScanContext, 'stage'>,
) => {
  reset();

  if (!scanDocument) {
    console.warn(
      'Android passport scanner is not available - native module failed to load',
    );
    logNFCEvent('error', 'module_unavailable', {
      ...context,
      stage: 'init',
    } as NFCScanContext);
    return Promise.reject(new Error('NFC scanning is currently unavailable.'));
  }

  return await scanDocument({
    documentNumber: inputs.passportNumber,
    dateOfBirth: inputs.dateOfBirth,
    dateOfExpiry: inputs.dateOfExpiry,
    canNumber: inputs.canNumber ?? '',
    useCan: inputs.useCan ?? false,
    sessionId: inputs.sessionId,
    skipReselect: inputs.skipReselect ?? false,
  });
};

const scanIOS = async (
  inputs: Inputs,
  context: Omit<NFCScanContext, 'stage'>,
) => {
  // Prefer direct native scanPassport when available (tests stub this directly)
  const iosReader = PassportReader as unknown as {
    scanPassport?: (
      passportNumber: string,
      dateOfBirth: string,
      dateOfExpiry: string,
      canNumber: string,
      useCan: boolean,
      skipPACE: boolean,
      skipCA: boolean,
      extendedMode: boolean,
      usePacePolling: boolean,
      sessionId: string,
    ) => Promise<unknown>;
  } | null;

  if (iosReader?.scanPassport) {
    return await iosReader.scanPassport(
      inputs.passportNumber,
      inputs.dateOfBirth,
      inputs.dateOfExpiry,
      inputs.canNumber ?? '',
      inputs.useCan ?? false,
      inputs.skipPACE ?? false,
      inputs.skipCA ?? false,
      inputs.extendedMode ?? false,
      inputs.usePacePolling ?? false,
      inputs.sessionId,
    );
  }

  // Fallback to normalized cross-platform scan
  if (!scanDocument) {
    console.warn(
      'iOS passport scanner is not available - native module failed to load',
    );
    logNFCEvent('error', 'module_unavailable', {
      ...context,
      stage: 'init',
    } as NFCScanContext);
    return Promise.reject(
      new Error(
        'NFC scanning is currently unavailable. Please ensure the app is properly installed.',
      ),
    );
  }

  return await scanDocument({
    documentNumber: inputs.passportNumber,
    dateOfBirth: inputs.dateOfBirth,
    dateOfExpiry: inputs.dateOfExpiry,
    canNumber: inputs.canNumber ?? '',
    useCan: inputs.useCan ?? false,
    skipPACE: inputs.skipPACE ?? false,
    skipCA: inputs.skipCA ?? false,
    extendedMode: inputs.extendedMode ?? false,
    usePacePolling: inputs.usePacePolling ?? false,
    sessionId: inputs.sessionId,
  });
};

const handleResponseIOS = (response: unknown) => {
  // Support string or object response
  const parsed: Record<string, unknown> =
    typeof response === 'string'
      ? (JSON.parse(response) as Record<string, unknown>)
      : ((response as Record<string, unknown>) ?? {});

  const dgHashesObj = JSON.parse(
    String(parsed?.dataGroupHashes ?? '{}'),
  ) as Record<string, DataGroupHash>;
  const dg1HashString = dgHashesObj?.DG1?.sodHash as string | undefined;
  const dg2HashString = dgHashesObj?.DG2?.sodHash as string | undefined;

  const mrz = parsed?.passportMRZ as string | undefined;
  if (!mrz || typeof mrz !== 'string') {
    throw new Error('Invalid iOS NFC response: missing passportMRZ');
  }

  const isHex = (s: string) => /^[0-9a-fA-F]*$/.test(s);
  if (dg1HashString !== undefined && !isHex(dg1HashString)) {
    throw new Error('Invalid DG1 sodHash hex string');
  }
  if (dg2HashString !== undefined && !isHex(String(dg2HashString))) {
    throw new Error('Invalid DG2 sodHash hex string');
  }

  const dg1Hash = dg1HashString
    ? Array.from(Buffer.from(dg1HashString, 'hex'))
    : [];
  const dg2Hash = dg2HashString
    ? Array.from(Buffer.from(String(dg2HashString), 'hex'))
    : [];

  const eContentBase64 = parsed?.eContentBase64 as string | undefined;
  const signedAttributes = parsed?.signedAttributes as string | undefined;
  const signatureBase64 = parsed?.signatureBase64 as string | undefined;
  // const _dataGroupsPresent = parsed?.dataGroupsPresent;
  // const _placeOfBirth = parsed?.placeOfBirth;
  // const _activeAuthenticationPassed = parsed?.activeAuthenticationPassed;
  // const _isPACESupported = parsed?.isPACESupported;
  // const _isChipAuthenticationSupported = parsed?.isChipAuthenticationSupported;
  // const _residenceAddress = parsed?.residenceAddress;
  // const passportPhoto = parsed?.passportPhoto;
  // const _encapsulatedContentDigestAlgorithm =
  //   parsed?.encapsulatedContentDigestAlgorithm;
  const documentSigningCertificate = parsed?.documentSigningCertificate as
    | string
    | undefined;
  const pem = JSON.parse(String(documentSigningCertificate)).PEM.replace(
    /\n/g,
    '',
  );
  const eContentArray = Array.from(
    Buffer.from(String(signedAttributes ?? ''), 'base64'),
  );
  const signedEContentArray = eContentArray.map(byte =>
    byte > 127 ? byte - 256 : byte,
  );

  const concatenatedDataHashesArray = Array.from(
    Buffer.from(String(eContentBase64 ?? ''), 'base64'),
  );
  const concatenatedDataHashesArraySigned = concatenatedDataHashesArray.map(
    byte => (byte > 127 ? byte - 256 : byte),
  );

  const encryptedDigestArray = Array.from(
    Buffer.from(String(signatureBase64 ?? ''), 'base64'),
  ).map(byte => (byte > 127 ? byte - 256 : byte));

  const document_type = String(mrz).length === 88 ? 'passport' : 'id_card';

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
    // _photo,
    // _digestAlgorithm,
    // _signerInfoDigestAlgorithm,
    // _digestEncryptionAlgorithm,
    // _LDSVersion,
    // _unicodeVersion,
    encapContent,
    documentSigningCertificate,
    dataGroupHashes,
  } = response;

  const dgHashesObj = JSON.parse(dataGroupHashes);
  const dg1HashString = dgHashesObj['1'];
  const dg1Hash = dg1HashString
    ? Array.from(Buffer.from(dg1HashString, 'hex'))
    : [];
  const dg2HashString = dgHashesObj['2'];
  const dg2Hash = dg2HashString
    ? Array.from(Buffer.from(dg2HashString, 'hex'))
    : [];
  const pem =
    '-----BEGIN CERTIFICATE-----' +
    documentSigningCertificate +
    '-----END CERTIFICATE-----';

  const dgPresents = Object.keys(dgHashesObj)
    .map(key => parseInt(key, 10))
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
