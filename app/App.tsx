import React, { useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  DEFAULT_PNUMBER,
  DEFAULT_DOB,
  DEFAULT_DOE
} from '@env';
import { PassportData, Proof } from '../common/src/utils/types';
import { samplePassportData } from '../common/src/utils/passportDataStatic';
import "@ethersproject/shims"
import { ethers } from "ethers";
import MainScreen from './src/screens/MainScreen';
import { Steps } from './src/utils/utils';
import { startCameraScan } from './src/utils/cameraScanner';
import { scan } from './src/utils/nfcScanner';
import { mint } from './src/utils/minter';
import { toastConfig } from './src/utils/toastConfig';
import { Buffer } from 'buffer';
import { YStack } from 'tamagui';
import { prove } from './src/utils/prover';
import RNFS from 'react-native-fs';
import { ZKEY_URL } from '../common/src/constants/constants';
global.Buffer = Buffer;

console.log('DEFAULT_PNUMBER', DEFAULT_PNUMBER);

const localZkeyPath = RNFS.DocumentDirectoryPath + '/proof_of_passport.zkey';
console.log('localZkeyPath', localZkeyPath);

function App(): JSX.Element {
  const [passportNumber, setPassportNumber] = useState(DEFAULT_PNUMBER ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DOB ?? '');
  const [dateOfExpiry, setDateOfExpiry] = useState(DEFAULT_DOE ?? '');
  const [address, setAddress] = useState<string>(ethers.ZeroAddress);
  const [passportData, setPassportData] = useState<PassportData>(samplePassportData as PassportData);
  const [step, setStep] = useState<number>(Steps.MRZ_SCAN);
  const [generatingProof, setGeneratingProof] = useState<boolean>(false);
  const [proofTime, setProofTime] = useState<number>(0);
  const [proof, setProof] = useState<Proof | null>(null);
  const [mintText, setMintText] = useState<string>("");
  const [majority, setMajority] = useState<number>(18);
  const [zkeydownloadStatus, setDownloadStatus] = useState<"not_started" | "downloading" | "completed" | "error">("not_started");

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
    downloadZkey()
  }, []);

  async function downloadZkey() {
    const fileExists = await RNFS.exists(localZkeyPath);
    if (!fileExists) {
      console.log('launching zkey download')
      setDownloadStatus('downloading');

      let previousPercentComplete = -1;

      const options = {
        fromUrl: ZKEY_URL,
        toFile: localZkeyPath,
        background: true,
        begin: () => {
          console.log('Download has begun');
        },
        progress: (res: any) => {
          const percentComplete = Math.floor((res.bytesWritten / res.contentLength) * 100);
          if (percentComplete !== previousPercentComplete) {
            console.log(`${percentComplete}%`);
            previousPercentComplete = percentComplete;
          }
        },
      };
      
      RNFS.downloadFile(options).promise
        .then(() => {
          setDownloadStatus('completed')
          console.log('Download complete');
        })
        .catch((error) => {
          console.error(error);
          setDownloadStatus('error');
          Toast.show({
            type: 'error',
            text1: `Error: ${error.message}`,
            position: 'top',
            bottomOffset: 80,
          })
        });
    } else {
      console.log('zkey already downloaded')
      setDownloadStatus('completed');
    }
  }

  const handleStartCameraScan = async () => {
    startCameraScan({
      setPassportNumber,
      setDateOfBirth,
      setDateOfExpiry,
      setStep,
    });
  };


  const handleNFCScan = () => {
    scan({
      passportNumber,
      dateOfBirth,
      dateOfExpiry,
      setPassportData,
      setStep,
    });
  };

  const handleProve = () => {
    prove({
      passportData,
      disclosure,
      address,
      setStep,
      setGeneratingProof,
      setProofTime,
      setProof,
    });
  };

  const handleMint = () => {
    mint({
      proof,
      setStep,
      setMintText,
    });
  };

  return (
    <YStack f={1} bg="white" h="100%" w="100%">
      <YStack h="100%" w="100%">
        <MainScreen
          onStartCameraScan={handleStartCameraScan}
          nfcScan={handleNFCScan}
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
          zkeydownloadStatus={zkeydownloadStatus}
        />
      </YStack>
      <Toast config={toastConfig} />
    </YStack>
  );
}

export default App;
