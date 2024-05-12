import { NativeModules, Platform } from 'react-native';
import { revealBitmapFromMapping } from '../../../common/src/utils/revealBitmap';
import { generateCircuitInputs } from '../../../common/src/utils/generateInputs';
import { parseProofAndroid, Steps } from './utils';
import { PassportData, Proof } from '../../../common/src/utils/types';
import * as amplitude from '@amplitude/analytics-react-native';
import RNFS from 'react-native-fs';

interface ProverProps {
  passportData: PassportData | null;
  disclosure: any;
  address: string;
  majority: number;
  setStep: (value: number) => void;
  setGeneratingProof: (value: boolean) => void;
  setProofTime: (value: number) => void;
  setProof: (proof: Proof) => void;
  toast: any
}

export const prove = async ({
  passportData,
  disclosure,
  address,
  majority,
  setStep,
  setGeneratingProof,
  setProofTime,
  setProof,
  toast
}: ProverProps) => {
  if (passportData === null) {
    console.log('passport data is null');
    return;
  }
  setStep(Steps.GENERATING_PROOF);
  setGeneratingProof(true);
  await new Promise(resolve => setTimeout(resolve, 10));

  const reveal_bitmap = revealBitmapFromMapping(disclosure);

  try {
    const inputs = generateCircuitInputs(
      passportData,
      reveal_bitmap,
      address,
      majority,
      { developmentMode: false }
    );
    amplitude.track('Sig alg supported: ' + passportData.signatureAlgorithm);

    Object.keys(inputs).forEach((key) => {
      if (Array.isArray(inputs[key as keyof typeof inputs])) {
        console.log(key, inputs[key as keyof typeof inputs].slice(0, 10), '...');
      } else {
        console.log(key, inputs[key as keyof typeof inputs]);
      }
    });

    const start = Date.now();
    await generateProof(inputs, setProofTime, setProof, setGeneratingProof, setStep);
    const end = Date.now();
    console.log('Total proof time from frontend:', end - start);
    amplitude.track('Proof generation successful, took ' + ((end - start) / 1000) + ' seconds');
  } catch (error: any) {
    console.error(error);
    toast.show('Error', {
      message: error.message,
      customData: {
        type: "error",
      },
    })
    setStep(Steps.NFC_SCAN_COMPLETED);
    setGeneratingProof(false);
    amplitude.track(error.message);
  }
};

const generateProof = async (
  inputs: any,
  setProofTime: (value: number) => void,
  setProof: (proof: Proof) => void,
  setGeneratingProof: (value: boolean) => void,
  setStep: (value: number) => void,
) => {
  try {
    console.log('launching generateProof function');
    console.log('inputs in App.tsx', inputs);

    const zkey_path = RNFS.DocumentDirectoryPath + '/proof_of_passport.zkey'
    // "/data/user/0/com.proofofpassport/files/proof_of_passport.zkey" on android
    const witness_calculator = "proof_of_passport"
    const dat_file_name = "proof_of_passport"

    const startTime = Date.now();
    const response = await NativeModules.Prover.runProveAction(
      zkey_path,
      witness_calculator,
      dat_file_name,
      inputs
    );
    const endTime = Date.now();
    console.log('time spent:', endTime - startTime);
    console.log('proof response:', response);
    console.log('typeof proof response:', typeof response);
    setProofTime(endTime - startTime);

    if (Platform.OS === 'android') {
      const parsedResponse = parseProofAndroid(response);
      console.log('parsedResponse', parsedResponse);

      setProof(parsedResponse);
      setGeneratingProof(false);
      setStep(Steps.PROOF_GENERATED);
    } else {
      const parsedResponse = JSON.parse(response);
      console.log('parsedResponse', parsedResponse);
      console.log('parsedResponse.proof:', parsedResponse.proof);
      console.log('parsedResponse.inputs:', parsedResponse.inputs);

      setProof({
        proof: parsedResponse.proof,
        pub_signals: parsedResponse.inputs,
      });
      setGeneratingProof(false);
      setStep(Steps.PROOF_GENERATED);
    }
  } catch (err: any) {
    console.log('err', err);
  }
};