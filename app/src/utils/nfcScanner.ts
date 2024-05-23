import { NativeModules, Platform } from 'react-native';
// @ts-ignore
import PassportReader from 'react-native-passport-reader';
import { toStandardName } from '../../../common/src/utils/formatNames';
import { checkInputs } from '../../utils/utils';
import { Steps } from './utils';
import { PassportData } from '../../../common/src/utils/types';
import forge from 'node-forge';
import { Buffer } from 'buffer';
import * as amplitude from '@amplitude/analytics-react-native';
import useUserStore from '../stores/userStore';
import useNavigationStore from '../stores/navigationStore';

export const scan = async () => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry
  } = useUserStore.getState()
  
  const {toast, setStep} = useNavigationStore.getState();

  const check = checkInputs(
    passportNumber,
    dateOfBirth,
    dateOfExpiry
  );

  if (!check.success) {
    toast?.show("Unvailable", {
      message: check.message,
      customData: {
        type: "info",
      },
    })
    return;
  }

  console.log('scanning...');
  setStep(Steps.NFC_SCANNING);

  if (Platform.OS === 'android') {
    scanAndroid();
  } else {
    scanIOS();
  }
};

const scanAndroid = async () => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry
  } = useUserStore.getState()
  const {toast, setStep} = useNavigationStore.getState();

  try {
    const response = await PassportReader.scan({
      documentNumber: passportNumber,
      dateOfBirth: dateOfBirth,
      dateOfExpiry: dateOfExpiry
    });
    console.log('scanned');
    amplitude.track('NFC scan successful');
    handleResponseAndroid(response);
  } catch (e: any) {
    console.log('error during scan:', e);
    setStep(Steps.MRZ_SCAN_COMPLETED);
    amplitude.track('NFC scan unsuccessful', { error: JSON.stringify(e) });
    toast?.show('Error', {
      message: e.message,
      customData: {
        type: "error",
      },
    })

  }
};

const scanIOS = async () => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry
  } = useUserStore.getState()
  const {toast, setStep} = useNavigationStore.getState();

  try {
    const response = await NativeModules.PassportReader.scanPassport(
      passportNumber,
      dateOfBirth,
      dateOfExpiry
    );
    console.log('scanned');
    handleResponseIOS(response);
    amplitude.track('NFC scan successful');
  } catch (e: any) {
    console.log('error during scan:', e);
    setStep(Steps.MRZ_SCAN_COMPLETED);
    amplitude.track(`NFC scan unsuccessful, error ${e.message}`);
    if (!e.message.includes("UserCanceled")) {
      toast?.show('Failed to read passport', {
        message: e.message,
        customData: {
          type: "error",
        },
      })
    }
  }
};

const handleResponseIOS = async (
  response: any,
) => {
  const {toast} = useNavigationStore.getState();

  const parsed = JSON.parse(response);

  const eContentBase64 = parsed.eContentBase64; // this is what we call concatenatedDataHashes in android world
  const signedAttributes = parsed.signedAttributes; // this is what we call eContent in android world
  const signatureAlgorithm = parsed.signatureAlgorithm;
  const mrz = parsed.passportMRZ;
  const signatureBase64 = parsed.signatureBase64;
  console.log('dataGroupsPresent', parsed.dataGroupsPresent)
  console.log('placeOfBirth', parsed.placeOfBirth)
  console.log('activeAuthenticationPassed', parsed.activeAuthenticationPassed)
  console.log('isPACESupported', parsed.isPACESupported)
  console.log('isChipAuthenticationSupported', parsed.isChipAuthenticationSupported)
  console.log('residenceAddress', parsed.residenceAddress)
  console.log('passportPhoto', parsed.passportPhoto.substring(0, 100) + '...')
  console.log('signatureAlgorithm', signatureAlgorithm)
  console.log('parsed.documentSigningCertificate', parsed.documentSigningCertificate)
  const pem = JSON.parse(parsed.documentSigningCertificate).PEM.replace(/\\\\n/g, '\n')
  console.log('pem', pem)

  try {
    const cert = forge.pki.certificateFromPem(pem);
    console.log('cert', cert);
    const publicKey = cert.publicKey;
    console.log('publicKey', publicKey);

    const modulus = (publicKey as any).n.toString(10);

    const eContentArray = Array.from(Buffer.from(signedAttributes, 'base64'));
    const signedEContentArray = eContentArray.map(byte => byte > 127 ? byte - 256 : byte);

    const concatenatedDataHashesArray = Array.from(Buffer.from(eContentBase64, 'base64'));
    const concatenatedDataHashesArraySigned = concatenatedDataHashesArray.map(byte => byte > 127 ? byte - 256 : byte);

    const encryptedDigestArray = Array.from(Buffer.from(signatureBase64, 'base64')).map(byte => byte > 127 ? byte - 256 : byte);

    amplitude.track('Sig alg before conversion: ' + signatureAlgorithm);
    const passportData = {
      mrz,
      signatureAlgorithm: toStandardName(signatureAlgorithm),
      pubKey: {
        modulus: modulus,
      },
      dataGroupHashes: concatenatedDataHashesArraySigned,
      eContent: signedEContentArray,
      encryptedDigest: encryptedDigestArray,
      photoBase64: "data:image/jpeg;base64," + parsed.passportPhoto,
    };
    amplitude.track('Sig alg after conversion: ' + passportData.signatureAlgorithm);

    console.log('mrz', passportData.mrz);
    console.log('signatureAlgorithm', passportData.signatureAlgorithm);
    console.log('pubKey', passportData.pubKey);
    console.log('dataGroupHashes', [...passportData.dataGroupHashes.slice(0, 10), '...']);
    console.log('eContent', [...passportData.eContent.slice(0, 10), '...']);
    console.log('encryptedDigest', [...passportData.encryptedDigest.slice(0, 10), '...']);
    console.log("photoBase64", passportData.photoBase64.substring(0, 100) + '...')

    // console.log('passportData', JSON.stringify(passportData, null, 2));

    useUserStore.getState().registerPassportData(passportData)
    useNavigationStore.getState().setStep(Steps.NFC_SCAN_COMPLETED);
  } catch (e: any) {
    console.log('error during parsing:', e);
    useNavigationStore.getState().setStep(Steps.MRZ_SCAN_COMPLETED);
    amplitude.track('Signature algorithm unsupported (ecdsa not parsed)', { error: JSON.stringify(e) });
    toast?.show('Error', {
      message: "Your signature algorithm is not supported at that time. Please try again later.",
      customData: {
        type: "error",
      },
    })
  }
};

const handleResponseAndroid = async (
  response: any,
) => {
  const {
    mrz,
    signatureAlgorithm,
    modulus,
    curveName,
    publicKeyQ,
    eContent,
    encryptedDigest,
    photo,
    digestAlgorithm,
    signerInfoDigestAlgorithm,
    digestEncryptionAlgorithm,
    LDSVersion,
    unicodeVersion,
    encapContent
  } = response;

  amplitude.track('Sig alg before conversion: ' + signatureAlgorithm);
  const passportData: PassportData = {
    mrz: mrz.replace(/\n/g, ''),
    signatureAlgorithm: toStandardName(signatureAlgorithm),
    pubKey: {
      modulus: modulus,
      curveName: curveName,
      publicKeyQ: publicKeyQ,
    },
    dataGroupHashes: JSON.parse(encapContent),
    eContent: JSON.parse(eContent),
    encryptedDigest: JSON.parse(encryptedDigest),
    photoBase64: photo.base64,
  };
  amplitude.track('Sig alg after conversion: ' + passportData.signatureAlgorithm);

  console.log('mrz', passportData.mrz);
  console.log('signatureAlgorithm', passportData.signatureAlgorithm);
  console.log('pubKey', passportData.pubKey);
  console.log('dataGroupHashes', passportData.dataGroupHashes);
  console.log('eContent', passportData.eContent);
  console.log('encryptedDigest', passportData.encryptedDigest);
  console.log("photoBase64", passportData.photoBase64.substring(0, 100) + '...')
  console.log("digestAlgorithm", digestAlgorithm)
  console.log("signerInfoDigestAlgorithm", signerInfoDigestAlgorithm)
  console.log("digestEncryptionAlgorithm", digestEncryptionAlgorithm)
  console.log("LDSVersion", LDSVersion)
  console.log("unicodeVersion", unicodeVersion)
  console.log("encapContent", encapContent)

  useUserStore.getState().registerPassportData(passportData)
  useNavigationStore.getState().setStep(Steps.NFC_SCAN_COMPLETED);
};