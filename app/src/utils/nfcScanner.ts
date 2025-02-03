import { NativeModules, Platform } from 'react-native';
import PassportReader from 'react-native-passport-reader';

// @ts-ignore
import { Buffer } from 'buffer';

import { parsePassportData } from '../../../common/src/utils/parsePassportData';
import { PassportData } from '../../../common/src/utils/types';
import useNavigationStore from '../stores/navigationStore';
import useUserStore from '../stores/userStore';
import { checkInputs } from '../utils/utils';

export const scan = async (
  setModalProofStep: (modalProofStep: number) => void,
) => {
  const { passportNumber, dateOfBirth, dateOfExpiry } = useUserStore.getState();

  const { toast, trackEvent } = useNavigationStore.getState();

  const check = checkInputs(passportNumber, dateOfBirth, dateOfExpiry);

  if (!check.success) {
    trackEvent('Inputs Failed', {
      success: false,
      error: check.message,
    });
    toast.show('Unvailable', {
      message: check.message,
      customData: {
        type: 'info',
      },
    });
    return;
  }

  trackEvent('NFC Started', {
    success: true,
  });

  console.log('scanning...');

  if (Platform.OS === 'android') {
    scanAndroid(setModalProofStep, Date.now());
  } else {
    scanIOS(setModalProofStep, Date.now());
  }
};

const scanAndroid = async (
  setModalProofStep: (modalProofStep: number) => void,
  startTime: number,
) => {
  const { passportNumber, dateOfBirth, dateOfExpiry } = useUserStore.getState();
  const { toast, setNfcSheetIsOpen, trackEvent } =
    useNavigationStore.getState();
  setNfcSheetIsOpen(true);

  try {
    const response = await PassportReader.scan({
      documentNumber: passportNumber,
      dateOfBirth: dateOfBirth,
      dateOfExpiry: dateOfExpiry,
    });
    console.log('scanned');
    setNfcSheetIsOpen(false);
    handleResponseAndroid(response, setModalProofStep);

    trackEvent('NFC Success', {
      success: true,
      duration_ms: Date.now() - startTime,
    });
  } catch (e: any) {
    console.log('error during scan:', e);
    setNfcSheetIsOpen(false);
    if (e.message.includes('InvalidMRZKey')) {
      toast.show('Error', {
        message:
          'Go to previous screen and rescan your passport with the camera',
        customData: {
          type: 'error',
        },
        timeout: 5000,
      });
      trackEvent('Invalid Key', {
        success: false,
        error: e.message,
      });
      useNavigationStore.getState().setSelectedTab('scan');
    } else {
      toast.show('Error', {
        message: e.message,
        customData: {
          type: 'error',
        },
      });
      trackEvent('NFC Failed', {
        success: false,
        error: e.message,
        duration_ms: Date.now() - startTime,
      });
    }
  }
};

const scanIOS = async (
  setModalProofStep: (modalProofStep: number) => void,
  startTime: number,
) => {
  const { passportNumber, dateOfBirth, dateOfExpiry } = useUserStore.getState();
  const { toast, trackEvent } = useNavigationStore.getState();

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
    handleResponseIOS(response, setModalProofStep);

    trackEvent('NFC Success', {
      success: true,
      duration_ms: Date.now() - startTime,
    });
  } catch (e: any) {
    console.log('error during scan:', e);
    if (e.message.includes('InvalidMRZKey')) {
      toast.show('Error', {
        message:
          'Go to previous screen and rescan your passport with the camera',
        customData: {
          type: 'error',
        },
        timeout: 5000,
      });
      useNavigationStore.getState().setSelectedTab('scan');
      trackEvent('Invalid Key', {
        success: false,
        error: e.message,
      });
    } else {
      toast.show('Error', {
        message: e.message,
        customData: {
          type: 'error',
        },
      });
      trackEvent('NFC Failed', {
        success: false,
        error: e.message,
      });
    }
  }
};

const handleResponseIOS = async (
  response: any,
  _setModalProofStep: (modalProofStep: number) => void,
) => {
  const { toast, trackEvent } = useNavigationStore.getState();

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
  console.log('activeAuthenticationPassed', parsed?.activeAuthenticationPassed);
  console.log('isPACESupported', parsed?.isPACESupported);
  console.log(
    'isChipAuthenticationSupported',
    parsed?.isChipAuthenticationSupported,
  );
  console.log(
    'encapsulatedContentDigestAlgorithm',
    parsed?.encapsulatedContentDigestAlgorithm,
  );
  const pem = JSON.parse(parsed?.documentSigningCertificate).PEM.replace(
    /\n/g,
    '',
  );
  console.log('pem', pem);

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
    photoBase64: parsed?.passportPhoto
      ? 'data:image/jpeg;base64,' + parsed?.passportPhoto
      : '',
    mockUser: false,
  };

  try {

    parsePassportDataAsync(passportData);

  } catch (e: any) {
    console.log('error during parsing:', e);
    toast.show('Error during passport data parsing', {
      message: e.message,
      customData: {
        type: 'error',
      },
    });

    trackEvent('Passport ParseFailed', {
      success: false,
      error: e.message,
    });
  }
};

const handleResponseAndroid = async (
  response: any,
  _setModalProofStep: (modalProofStep: number) => void,
) => {
  const { toast, trackEvent } = useNavigationStore.getState();

  const {
    mrz,
    eContent,
    encryptedDigest,
    photo,
    digestAlgorithm,
    signerInfoDigestAlgorithm,
    digestEncryptionAlgorithm,
    LDSVersion,
    unicodeVersion,
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
    photoBase64: photo?.base64 ?? '',
    mockUser: false,
  };

  console.log(
    'passportData',
    JSON.stringify(
      {
        ...passportData,
        photoBase64: passportData.photoBase64.substring(0, 100) + '...',
      },
      null,
      2,
    ),
  );
  /***
  console.log('mrz', passportData?.mrz);
  console.log('dataGroupHashes', passportData?.eContent);
  console.log('eContent', passportData?.eContent);
  console.log('encryptedDigest', passportData?.encryptedDigest);
  console.log(
    'photoBase64',
    passportData?.photoBase64.substring(0, 100) + '...',
  );
  console.log('digestAlgorithm', digestAlgorithm);
  console.log('signerInfoDigestAlgorithm', signerInfoDigestAlgorithm);
  console.log('digestEncryptionAlgorithm', digestEncryptionAlgorithm);
  console.log('LDSVersion', LDSVersion);
  console.log('unicodeVersion', unicodeVersion);
  console.log('encapContent', encapContent);
  console.log('documentSigningCertificate', documentSigningCertificate);
  ***/

  try {
    parsePassportDataAsync(passportData);

  } catch (e: any) {
    console.log('error during parsing:', e);
    toast.show('Error', {
      message: e.message,
      customData: {
        type: 'error',
      },
    });

    trackEvent('Passport ParseFailed', {
      success: false,
      error: e.message,
    });
  }
};

async function parsePassportDataAsync(passportData: PassportData) {
  const { trackEvent } = useNavigationStore.getState();
  const parsedPassportData = parsePassportData(passportData);
  await useUserStore.getState().setPassportMetadata(parsedPassportData);
  await useUserStore.getState().registerPassportData(passportData);
  trackEvent('Passport Parsed', {
    success: true,
    data_groups: parsedPassportData.dataGroups,
    dg1_hash_function: parsedPassportData.dg1HashFunction,
    dg1_hash_offset: parsedPassportData.dg1HashOffset,
    dg_padding_bytes: parsedPassportData.dgPaddingBytes,
    e_content_size: parsedPassportData.eContentSize,
    e_content_hash_function: parsedPassportData.eContentHashFunction,
    e_content_hash_offset: parsedPassportData.eContentHashOffset,
    signed_attr_size: parsedPassportData.signedAttrSize,
    signed_attr_hash_function: parsedPassportData.signedAttrHashFunction,
    signature_algorithm: parsedPassportData.signatureAlgorithm,
    salt_length: parsedPassportData.saltLength,
    curve_or_exponent: parsedPassportData.curveOrExponent,
    signature_algorithm_bits: parsedPassportData.signatureAlgorithmBits,
    country_code: parsedPassportData.countryCode,
    csca_found: parsedPassportData.cscaFound,
    csca_hash_function: parsedPassportData.cscaHashFunction,
    csca_signature: parsedPassportData.cscaSignature,
    csca_salt_length: parsedPassportData.cscaSaltLength,
    csca_curve_or_exponent: parsedPassportData.cscaCurveOrExponent,
    csca_signature_algorithm_bits:
      parsedPassportData.cscaSignatureAlgorithmBits,
    dsc: parsedPassportData.dsc,
  });

  useNavigationStore.getState().setSelectedTab('next');

}
