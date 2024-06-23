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
import { CSCA_AKI_MODULUS, k_csca, k_dsc, max_cert_bytes, n_csca, n_dsc } from '../../../common/src/constants/constants';
import { sha256Pad } from '../../../common/src/utils/shaPad';
import { findStartIndex, getCSCAInputs } from '../../../common/src/utils/csca';
function derToBytes(derValue: string) {
  const bytes = [];
  for (let i = 0; i < derValue.length; i++) {
    bytes.push(derValue.charCodeAt(i));
  }
  return bytes;
}

export const scan = async () => {
  const {
    passportNumber,
    dateOfBirth,
    dateOfExpiry,
    cscaProof
  } = useUserStore.getState()

  const { toast, setStep } = useNavigationStore.getState();

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
    dateOfExpiry,
    dscCertificate
  } = useUserStore.getState()
  const { toast, setStep } = useNavigationStore.getState();

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
  const { toast, setStep } = useNavigationStore.getState();

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
  const { toast } = useNavigationStore.getState();

  const parsed = JSON.parse(response);

  const eContentBase64 = parsed.eContentBase64; // this is what we call concatenatedDataHashes in android world
  const signedAttributes = parsed.signedAttributes; // this is what we call eContent in android world
  const signatureAlgorithm = parsed.signatureAlgorithm;
  const mrz = parsed.passportMRZ;
  const signatureBase64 = parsed.signatureBase64;
  //console.log('dataGroupsPresent', parsed.dataGroupsPresent)
  //console.log('placeOfBirth', parsed.placeOfBirth)
  //console.log('activeAuthenticationPassed', parsed.activeAuthenticationPassed)
  //console.log('isPACESupported', parsed.isPACESupported)
  //console.log('isChipAuthenticationSupported', parsed.isChipAuthenticationSupported)
  //console.log('residenceAddress', parsed.residenceAddress)
  //console.log('passportPhoto', parsed.passportPhoto.substring(0, 100) + '...')
  //console.log('signatureAlgorithm', signatureAlgorithm)
  //console.log('parsed.documentSigningCertificate', parsed.documentSigningCertificate)
  const pem = JSON.parse(parsed.documentSigningCertificate).PEM.replace(/\\\\n/g, '')
  //console.log('pem', pem)
  const certificate = forge.pki.certificateFromPem(pem);
  useUserStore.getState().dscCertificate = certificate;

  /*** begging of CSCA code implementation */

  //const dsc_certificate = forge.pki.certificateFromPem(pem);

  // // Find the authorityKeyIdentifier extension
  // const authorityKeyIdentifierExt = certificate.extensions.find(
  //   (ext) => ext.name === 'authorityKeyIdentifier'
  // );

  // // if (authorityKeyIdentifierExt) {
  // //   // Remove the ASN.1 DER prefix (if present) and convert the rest to byte array
  // const value = authorityKeyIdentifierExt.value;

  // //   // Function to convert ASN.1 DER encoded value to a byte array


  // const byteArray = derToBytes(value);
  // //   console.log('Authority Key Identifier (byte array):', byteArray);
  // //   // Convert byte array to the desired format
  // const formattedValue = byteArray.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
  // //   console.log('Formatted Authority Key Identifier:', formattedValue);
  // //   /*** CSCA chain verif ***/
  // //const cscac_aki: string = parsed.documentSigningCertificate.aki;
  // //console.log('cscac_aki_from_passport', cscac_aki);

  // const formattedValueAdjusted = formattedValue.substring(12); // Remove the first '30:16:80:14:' from the formatted string
  // const cscac_modulus: string = CSCA_AKI_MODULUS[formattedValueAdjusted as keyof typeof CSCA_AKI_MODULUS];
  // console.log('CSCA modulus extracted from json:', cscac_modulus);

  // } else {
  //   console.log('Authority Key Identifier not found');
  // }

  // // signature extraction pem
  // const signature = derToBytes(certificate.signature);
  // //console.log('DSC signature:', signature);
  // const formattedValue = signature.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(':');
  // //console.log('DSC signature in hex:', formattedValue);
  // //const signature10 = (signature as any).n.toString(10);
  // //console.log('DSC signature in 10:', signature10);






  // // Extract the TBS (To Be Signed) part of the certificate which is signed by the root certificate
  // // Convert the Asn1 object to a DER-encoded string
  // const tbsCertificateDer = forge.asn1.toDer(certificate.tbsCertificate).getBytes();
  // const tbsCertificateBytes = derToBytes(tbsCertificateDer);
  // //console.log('TBS Certificate Bytes:', tbsCertificateBytes);
  // const dsc_modulus = (certificate.publicKey as any).n.toString(16); // Ensure this is a string
  // console.log('DSC modulus:', dsc_modulus);
  // const dsc_tbsCertificateUint8Array = Uint8Array.from(tbsCertificateBytes.map(byte => parseInt(byte.toString(16), 16)));
  // const [dsc_message_padded, dsc_messagePaddedLen] = sha256Pad(dsc_tbsCertificateUint8Array, 4096);
  // const startIndex = findStartIndex(dsc_modulus, dsc_message_padded); // Now dsc_modulus is correctly passed as a string
  // console.log('startIndex:', startIndex);

  // /*** END of CSCA code implementation */

  console.log('*****');
  try {
    const cert = forge.pki.certificateFromPem(pem);
    //console.log('cert', cert);
    const publicKey = cert.publicKey;
    //console.log('publicKey', publicKey);

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
    // const inputs = generateCircuitInputsRegister(
    //   '0',
    //   '0',
    //   passportData,

    // );
    /*
    const inputs_csca = getCSCAInputs(
      certificate,
      null,
      n_dsc,
      k_dsc,
      n_csca,
      k_csca,
      max_cert_bytes
    );

    try {
      console.log("inputs_csca before requesting modal server - nfcsScanner.ts");;
      const response = await fetch("https://remicolin--app-py-run-script-dev.modal.run", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputs_csca)
      });
      useUserStore.getState().cscaProof = response;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Response from server:', data);
    } catch (error) {
      console.error('Error during request:', error);
    } 
    */

    //amplitude.track('Sig alg after conversion: ' + passportData.signatureAlgorithm);

    //console.log('passportData', JSON.stringify({
    //  ...passportData,
    //  photoBase64: passportData.photoBase64.substring(0, 100) + '...'
    //}, null, 2));

    //console.log('mrz', passportData.mrz);
    //console.log('signatureAlgorithm', passportData.signatureAlgorithm);
    //console.log('pubKey', passportData.pubKey);
    //console.log('dataGroupHashes', [...passportData.dataGroupHashes.slice(0, 10), '...']);
    //console.log('eContent', [...passportData.eContent.slice(0, 10), '...']);
    //console.log('encryptedDigest', [...passportData.encryptedDigest.slice(0, 10), '...']);
    //console.log("photoBase64", passportData.photoBase64.substring(0, 100) + '...')

    useUserStore.getState().registerPassportData(passportData)
    useNavigationStore.getState().setStep(Steps.NEXT_SCREEN);
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
    encapContent,
    documentSigningCertificate,
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

  console.log('passportData', JSON.stringify({
    ...passportData,
    photoBase64: passportData.photoBase64.substring(0, 100) + '...'
  }, null, 2));

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
  console.log("documentSigningCertificate", documentSigningCertificate)

  //console.log('pem', pem)
  const certificate = forge.pki.certificateFromPem(documentSigningCertificate);
  useUserStore.getState().dscCertificate = certificate;

  /*
  const inputs_csca = getCSCAInputs(
    certificate,
    null,
    n_dsc,
    k_dsc,
    n_csca,
    k_csca,
    max_cert_bytes,
    false
  );
  console.log("inputs_csca", inputs_csca)

  try {
    console.log("inputs_csca before requesting modal server - nfcsScanner.ts");;
    const response = await fetch("https://remicolin--app-py-run-script-dev.modal.run", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inputs_csca)
    });
    useUserStore.getState().cscaProof = response;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response from server:', data);
  } catch (error) {
    console.error('Error during request:', error);
  }
  */

  useUserStore.getState().registerPassportData(passportData)
  useNavigationStore.getState().setStep(Steps.NEXT_SCREEN);
};