/* eslint-disable @typescript-eslint/no-unused-vars */
import { NativeModules, Platform } from 'react-native';
import PassportReader from 'react-native-passport-reader';

// @ts-ignore
import * as amplitude from '@amplitude/analytics-react-native';
import '@react-navigation/native';
import { Buffer } from 'buffer';

import { initPassportDataParsing } from '../../../common/src/utils/passports/passport';
import { PassportMetadata } from '../../../common/src/utils/passports/passport_parsing/parsePassportData';
import { PassportData } from '../../../common/src/utils/types';
import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { checkInputs } from '../utils/utils';

interface Inputs {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

export const scan = async (inputs: Inputs) => {
  const { passportNumber, dateOfBirth, dateOfExpiry } = inputs;
  const check = checkInputs(passportNumber, dateOfBirth, dateOfExpiry);
  if (!check.success) {
    amplitude.track('inputs_invalid', { error: check.message });
    return;
  }
  console.log('SCANNING');
  if (Platform.OS === 'android') {
    await scanAndroid(inputs);
  } else {
    await scanIOS(inputs);
  }
};

const scanAndroid = async (inputs: Inputs) => {
  const { passportNumber, dateOfBirth, dateOfExpiry } = inputs;

  try {
    const response = await PassportReader.scan({
      documentNumber: passportNumber,
      dateOfBirth: dateOfBirth,
      dateOfExpiry: dateOfExpiry,
    });
    console.log('scanned');

    amplitude.track('nfc_scan_successful');
    await handleResponseAndroid(response);
  } catch (e: any) {
    console.log('error during scan:', e);

    amplitude.track('nfc_scan_unsuccessful', { error: e.message });
    if (e.message.includes('InvalidMRZKey')) {
      // TODO: Go back to the previous screen and rescan the passport with the camera/manual inputs
      //   toast.show('Error', {
      //     message:
      //       'Go to previous screen and rescan your passport with the camera',
      //     customData: {
      //       type: 'error',
      //     },
      //     timeout: 5000,
      //   });
      //   useNavigationStore.getState().setSelectedTab('scan');
    } else {
      //   toast.show('Error', {
      //     message: e.message,
      //     customData: {
      //       type: 'error',
      //     },
      //   });
    }
  }
};

const scanIOS = async (inputs: Inputs) => {
  const { passportNumber, dateOfBirth, dateOfExpiry } = inputs;

  console.log('passportNumber', passportNumber);
  console.log('dateOfBirth', dateOfBirth);
  console.log('dateOfExpiry', dateOfExpiry);

  try {
    const response = await NativeModules.PassportReader.scanPassport(
      passportNumber,
      dateOfBirth,
      dateOfExpiry,
    );
    console.log('scanned');
    await handleResponseIOS(response);
    amplitude.track('nfc_scan_successful');
  } catch (e: any) {
    console.log('error during scan:', e);
    amplitude.track('nfc_scan_unsuccessful', { error: e.message });
    if (!e.message.includes('UserCanceled')) {
      // handle cancelation
    }
    if (e.message.includes('InvalidMRZKey')) {
      // handle error
    } else {
      // handle error
    }
  }
};

const handleResponseIOS = async (response: any) => {
  const { trackEvent } = useNavigationStore.getState();
  const parsed = JSON.parse(response);
  const dgHashesObj = JSON.parse(parsed?.dataGroupHashes);
  const dg1HashString = dgHashesObj?.DG1?.sodHash;
  const dg1Hash = Array.from(Buffer.from(dg1HashString, 'hex'));
  const dg2HashString = dgHashesObj?.DG2?.sodHash;
  const dg2Hash = Array.from(Buffer.from(dg2HashString, 'hex'));

  const eContentBase64 = parsed?.eContentBase64; // this is what we call concatenatedDataHashes in android world
  const signedAttributes = parsed?.signedAttributes; // this is what we call eContent in android world
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

  const passportData = {
    mrz,
    dsc: pem,
    dg2Hash: dg2Hash,
    dg1Hash: dg1Hash,
    dgPresents: parsed?.dataGroupsPresent,
    eContent: concatenatedDataHashesArraySigned,
    signedAttr: signedEContentArray,
    encryptedDigest: encryptedDigestArray,
    photoBase64: '',
    mockUser: false,
    parsed: false,
  };

  try {
    parsePassportDataAsync(passportData);
  } catch (e: any) {
    console.log('error during parsing:', e);
    trackEvent('Passport ParseFailed', {
      success: false,
      error: e.message,
    });
  }
};

const handleResponseAndroid = async (response: any) => {
  const { trackEvent } = useNavigationStore.getState();
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

  const passportData: PassportData = {
    mrz: mrz.replace(/\n/g, ''),
    dsc: pem,
    dg2Hash,
    dg1Hash,
    dgPresents,
    eContent: JSON.parse(encapContent),
    signedAttr: JSON.parse(eContent),
    encryptedDigest: JSON.parse(encryptedDigest),
    photoBase64: '',
    mockUser: false,
    parsed: false,
  };

  try {
    parsePassportDataAsync(passportData);
  } catch (e: any) {
    console.log('error during parsing:', e);
    trackEvent('Passport ParseFailed', {
      success: false,
      error: e.message,
    });
  }
};

async function parsePassportDataAsync(passportData: PassportData) {
  const { trackEvent } = useNavigationStore.getState();
  const parsedPassportData = initPassportDataParsing(passportData);
  const passportMetadata: PassportMetadata =
    parsedPassportData.passportMetadata as PassportMetadata;
  await useUserStore.getState().registerPassportData(parsedPassportData);
  trackEvent('Passport Parsed', {
    success: true,
    data_groups: passportMetadata.dataGroups,
    dg1_hash_function: passportMetadata.dg1HashFunction,
    dg1_hash_offset: passportMetadata.dg1HashOffset,
    dg_padding_bytes: passportMetadata.dgPaddingBytes,
    e_content_size: passportMetadata.eContentSize,
    e_content_hash_function: passportMetadata.eContentHashFunction,
    e_content_hash_offset: passportMetadata.eContentHashOffset,
    signed_attr_size: passportMetadata.signedAttrSize,
    signed_attr_hash_function: passportMetadata.signedAttrHashFunction,
    signature_algorithm: passportMetadata.signatureAlgorithm,
    salt_length: passportMetadata.saltLength,
    curve_or_exponent: passportMetadata.curveOrExponent,
    signature_algorithm_bits: passportMetadata.signatureAlgorithmBits,
    country_code: passportMetadata.countryCode,
    csca_found: passportMetadata.cscaFound,
    csca_hash_function: passportMetadata.cscaHashFunction,
    csca_signature_algorithm: passportMetadata.cscaSignatureAlgorithm,
    csca_salt_length: passportMetadata.cscaSaltLength,
    csca_curve_or_exponent: passportMetadata.cscaCurveOrExponent,
    csca_signature_algorithm_bits: passportMetadata.cscaSignatureAlgorithmBits,
    dsc: passportMetadata.dsc,
  });

  useNavigationStore.getState().setSelectedTab('next');
}
