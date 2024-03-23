import React, { useEffect, useState } from 'react';
import {
  NativeModules,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import Toast, { BaseToast, ErrorToast, SuccessToast, ToastProps } from 'react-native-toast-message';
// @ts-ignore
import PassportReader from 'react-native-passport-reader';
import { checkInputs } from './utils/utils';
import {
  DEFAULT_PNUMBER,
  DEFAULT_DOB,
  DEFAULT_DOE
} from '@env';
import { PassportData } from '../common/src/utils/types';
import { revealBitmapFromMapping } from '../common/src/utils/revealBitmap';
import { toStandardName } from '../common/src/utils/formatNames';
import { generateCircuitInputs } from '../common/src/utils/generateInputs';
import { AWS_ENDPOINT } from '../common/src/constants/constants';
import {
  formatProof,
  formatInputs
} from '../common/src/utils/utils';
import { samplePassportData } from '../common/src/utils/passportDataStatic';
import "@ethersproject/shims"
import { ethers } from "ethers";
import axios from 'axios';
import groth16ExportSolidityCallData from './utils/snarkjs';
import contractAddresses from "./deployments/addresses.json"
import proofOfPassportArtefact from "./deployments/ProofOfPassport.json";
// import serializedTree from "./deployments/serialized_tree.json";
import MainScreen from './src/screens/MainScreen';
import { extractMRZInfo, formatDateToYYMMDD, Steps } from './src/utils/utils';
import forge from 'node-forge';
import { Buffer } from 'buffer';
import { YStack } from 'tamagui';
global.Buffer = Buffer;

console.log('DEFAULT_PNUMBER', DEFAULT_PNUMBER);

function App(): JSX.Element {
  const [passportNumber, setPassportNumber] = useState(DEFAULT_PNUMBER ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DOB ?? '');
  const [dateOfExpiry, setDateOfExpiry] = useState(DEFAULT_DOE ?? '');
  const [address, setAddress] = useState<string>(ethers.ZeroAddress);
  const [passportData, setPassportData] = useState<PassportData>(samplePassportData as PassportData);
  const [step, setStep] = useState<number>(Steps.MRZ_SCAN);
  const [generatingProof, setGeneratingProof] = useState<boolean>(false);
  const [proofTime, setProofTime] = useState<number>(0);
  const [proof, setProof] = useState<{ proof: string, inputs: string } | null>(null);
  const [mintText, setMintText] = useState<string>("");
  const [majority, setMajority] = useState<number>(18);

  const [disclosure, setDisclosure] = useState({
    issuing_state: false,
    name: false,
    passport_number: false,
    nationality: false,
    date_of_birth: false,
    gender: false,
    expiry_date: false,
    older_than: false,
  });

  const startCameraScan = async () => {
    if (Platform.OS === 'ios') {
      try {
        const result = await NativeModules.MRZScannerModule.startScanning();
        console.log("Scan result:", result);
        console.log(`Document Number: ${result.documentNumber}, Expiry Date: ${result.expiryDate}, Birth Date: ${result.birthDate}`);
        setPassportNumber(result.documentNumber);
        setDateOfBirth(formatDateToYYMMDD(result.birthDate));
        setDateOfExpiry(formatDateToYYMMDD(result.expiryDate));
      } catch (e) {
        console.error(e);
      }
    }
    else {
      NativeModules.CameraActivityModule.startCameraActivity()
        .then((mrzInfo: string) => {
          try {
            const { documentNumber, birthDate, expiryDate } = extractMRZInfo(mrzInfo);
            setPassportNumber(documentNumber);
            setDateOfBirth(birthDate);
            setDateOfExpiry(expiryDate);
            setStep(Steps.MRZ_SCAN_COMPLETED);
          } catch (error: any) {
            console.error('Invalid MRZ format:', error.message);
          }
        })
        .catch((error: any) => {
          console.error('Camera Activity Error:', error);
        });
    }
  };


  const handleDisclosureChange = (field: string) => {
    setDisclosure(
      {
        ...disclosure,
        [field]: !disclosure[field as keyof typeof disclosure]
      });
  };

  useEffect(() => {
    const logEventListener = DeviceEventEmitter.addListener('LOG_EVENT', e => {
      console.log(e);
    });

    return () => {
      logEventListener.remove();
    };
  }, []);

  useEffect(() => {
    init()
  }, []);

  async function init() {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('launching init')
    const res = await NativeModules.Prover.runInitAction()
    console.log('init done')
    console.log('init res', res)
  }

  async function handleResponseIOS(response: any) {
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
    console.log('parsed.documentSigningCertificate', parsed.documentSigningCertificate)
    const pem = JSON.parse(parsed.documentSigningCertificate).PEM.replace(/\\\\n/g, '\n')
    console.log('pem', pem)

    const cert = forge.pki.certificateFromPem(pem);
    const publicKey = cert.publicKey;

    const modulus = (publicKey as any).n.toString(10);

    const eContentArray = Array.from(Buffer.from(signedAttributes, 'base64'));
    const signedEContentArray = eContentArray.map(byte => byte > 127 ? byte - 256 : byte);

    const concatenatedDataHashesArray = Array.from(Buffer.from(eContentBase64, 'base64'));
    const concatenatedDataHashesArraySigned = concatenatedDataHashesArray.map(byte => byte > 127 ? byte - 256 : byte);

    const encryptedDigestArray = Array.from(Buffer.from(signatureBase64, 'base64')).map(byte => byte > 127 ? byte - 256 : byte);

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

    console.log('mrz', passportData.mrz);
    console.log('signatureAlgorithm', passportData.signatureAlgorithm);
    console.log('pubKey', passportData.pubKey);
    console.log('dataGroupHashes', [...passportData.dataGroupHashes.slice(0, 10), '...']);
    console.log('eContent', [...passportData.eContent.slice(0, 10), '...']);
    console.log('encryptedDigest', [...passportData.encryptedDigest.slice(0, 10), '...']);
    console.log("photoBase64", passportData.photoBase64.substring(0, 100) + '...')

    setPassportData(passportData);
    setStep(Steps.NFC_SCAN_COMPLETED);
  }

  async function handleResponseAndroid(response: any) {
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

    setPassportData(passportData);
    setStep(Steps.NFC_SCAN_COMPLETED);
  }

  async function scan() {
    const check = checkInputs(passportNumber, dateOfBirth, dateOfExpiry)
    if (!check.success) {
      Toast.show({
        type: 'error',
        text1: check.message,
      })
      return
    }

    console.log('scanning...');
    setStep(Steps.NFC_SCANNING);

    if (Platform.OS === 'android') {
      scanAndroid();
    } else {
      scanIOS();
    }
  }

  async function scanAndroid() {
    try {
      const response = await PassportReader.scan({
        documentNumber: passportNumber,
        dateOfBirth: dateOfBirth,
        dateOfExpiry: dateOfExpiry,
      });
      // console.log('response', response);
      console.log('scanned');
      handleResponseAndroid(response);
    } catch (e: any) {
      console.log('error during scan :', e);
      setStep(Steps.MRZ_SCAN_COMPLETED);
      Toast.show({
        type: 'error',
        text1: e.message,
      })
    }
  }

  async function scanIOS() {
    try {
      const response = await NativeModules.PassportReader.scanPassport(
        passportNumber,
        dateOfBirth,
        dateOfExpiry
      );
      console.log('response', response);
      console.log('scanned');
      handleResponseIOS(response);
    } catch (e: any) {
      console.log('error during scan :', e);
      setStep(Steps.MRZ_SCAN_COMPLETED);
      Toast.show({
        type: 'error',
        text1: e.message,
      })
    }
  }

  const handleProve = async (path: string) => {
    if (passportData === null) {
      console.log('passport data is null');
      return;
    }
    setStep(Steps.GENERATING_PROOF);
    setGeneratingProof(true)
    await new Promise(resolve => setTimeout(resolve, 10));

    const reveal_bitmap = revealBitmapFromMapping(disclosure);

    // if (!["sha256WithRSAEncryption"].includes(passportData.signatureAlgorithm)) {
    //   console.log(`${passportData.signatureAlgorithm} not supported for proof right now.`);
    //   return;
    // }

    const inputs = generateCircuitInputs(
      passportData,
      reveal_bitmap,
      address,
      { developmentMode: false }
    );

    Object.keys(inputs).forEach((key) => {
      if (Array.isArray(inputs[key as keyof typeof inputs])) {
        console.log(key, inputs[key as keyof typeof inputs].slice(0, 10), '...');
      } else {
        console.log(key, inputs[key as keyof typeof inputs]);
      }
    });

    const start = Date.now();
    await prove(inputs, path);

    const end = Date.now();
    console.log('Total proof time from frontend:', end - start);
  };

  async function prove(inputs: any, path?: string) {
    try {
      console.log('launching prove function')
      console.log('inputs in App.tsx', inputs)

      await NativeModules.Prover.runInitAction()

      const startTime = Date.now();

      console.log('running mopro prove action')
      const response = await NativeModules.Prover.runProveAction(inputs)
      console.log('proof response:', response)

      function parseProofAndroid(response: any) {
        const match = response.match(/GenerateProofResult\(proof=\[(.*?)\], inputs=\[(.*?)\]\)/);
        if (!match) throw new Error('Invalid input format');
      
        return {
          proof: match[1].split(',').map((n: any) => (parseInt(n.trim()) + 256) % 256),
          inputs: match[2].split(',').map((n: any) => (parseInt(n.trim()) + 256) % 256)
        }
      }

      const parsedResponse = Platform.OS == 'android'
        ? parseProofAndroid(response)
        : JSON.parse(response)

      console.log('parsedResponse', parsedResponse)

      const endTime = Date.now();
      setProofTime(endTime - startTime);

      console.log('running mopro verify action')
      const res = await NativeModules.Prover.runVerifyAction()
      console.log('verify response:', res)
      
      const finalProof = {
        proof: JSON.stringify(formatProof(parsedResponse.proof)),
        inputs: JSON.stringify(formatInputs(parsedResponse.inputs)),
      }
      
      console.log('finalProof:', finalProof)

      setProof(finalProof);

      setGeneratingProof(false)
    setStep(Steps.PROOF_GENERATED);
    } catch (err: any) {
      console.log('err', err);
    }
  }

  const handleMint = async () => {
    setStep(Steps.TX_MINTING);
    if (!proof?.proof || !proof?.inputs) {
      console.log('proof or inputs is null');
      return;
    }
    if (!contractAddresses.ProofOfPassport || !proofOfPassportArtefact.abi) {
      console.log('contracts addresses or abi not found');
      return;
    }

    // Format the proof and publicInputs as calldata for the verifier contract
    const p = JSON.parse(proof.proof);
    const i = JSON.parse(proof.inputs);
    console.log('p', p);
    console.log('i', i);
    const cd = groth16ExportSolidityCallData(p, i);
    const callData = JSON.parse(`[${cd}]`);
    console.log('callData', callData);

    // format transaction
    // for now, we do it all on sepolia
    try {
      const provider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
      const proofOfPassportOnSepolia = new ethers.Contract(contractAddresses.ProofOfPassport, proofOfPassportArtefact.abi, provider);

      const transactionRequest = await proofOfPassportOnSepolia
        .mint.populateTransaction(...callData);
      console.log('transactionRequest', transactionRequest);

      const response = await axios.post(AWS_ENDPOINT, {
        chain: "sepolia",
        tx_data: transactionRequest
      });
      console.log('response status', response.status)
      console.log('response data', response.data)
      setMintText(`Network: Sepolia. Transaction hash: ${response.data.hash}`)
      const receipt = await provider.waitForTransaction(response.data.hash);
      console.log('receipt status:', receipt?.status)
      if (receipt?.status === 1) {
        Toast.show({
          type: 'success',
          text1: 'SBT minted 🎊',
          position: 'top',
          bottomOffset: 80,
        })
        setMintText(`SBT minted. Network: Sepolia. Transaction hash: ${response.data.hash}`)
        setStep(Steps.TX_MINTED);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Proof of passport minting failed',
          position: 'top',
          bottomOffset: 80,
        })
        setMintText(`Error minting SBT. Network: Sepolia. Transaction hash: ${response.data.hash}`)
        setStep(Steps.PROOF_GENERATED);
      }
    } catch (err: any) {
      console.log('err', err);
      if (err.isAxiosError && err.response) {
        const errorMessage = err.response.data.error
        console.log('Server error message:', errorMessage);

        // parse blockchain error and show it
        const match = errorMessage.match(/execution reverted: "([^"]*)"/);
        if (match && match[1]) {
          console.log('Parsed blockchain error:', match[1]);
          Toast.show({
            type: 'error',
            text1: `Error: ${match[1]}`,
            position: 'top',
            bottomOffset: 80,
          })
        } else {
          Toast.show({
            type: 'error',
            text1: `Error: mint failed`,
            position: 'top',
            bottomOffset: 80,
          })
          console.log('Failed to parse blockchain error');
        }
      }
      setMintText(`Error minting SBT. Network: Sepolia.`)
    }
  };

  return (
    <YStack f={1} bg="white" h="100%" w="100%">
      <YStack h="100%" w="100%">
        <MainScreen
          onStartCameraScan={startCameraScan}
          nfcScan={scan}
          passportData={passportData}
          disclosure={disclosure}
          handleDisclosureChange={handleDisclosureChange}
          address={address}
          setAddress={setAddress}
          generatingProof={generatingProof}
          handleProve={handleProve}
          step={step}
          mintText={mintText}
          proof={proof}
          proofTime={proofTime}
          handleMint={handleMint}
          setStep={setStep}
          passportNumber={passportNumber}
          setPassportNumber={setPassportNumber}
          dateOfBirth={dateOfBirth}
          setDateOfBirth={setDateOfBirth}
          dateOfExpiry={dateOfExpiry}
          setDateOfExpiry={setDateOfExpiry}
          majority={majority}
          setMajority={setMajority}
        />
      </YStack>
      <Toast config={toastConfig} />
    </YStack>
  );
}

export default App;


export const toastConfig = {
  info: (props: ToastProps) => (
    <BaseToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "500",
      }}
    />
  ),
  error: (props: ToastProps) => (
    <ErrorToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "400",
      }}
    />
  ),
  success: (props: ToastProps) => (
    <SuccessToast
      {...props}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: "600",
      }}
      text2Style={{
        fontSize: 15,
        fontWeight: "400",
      }}
    />
  ),
};
