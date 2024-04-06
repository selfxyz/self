import { NativeModules, Platform } from 'react-native';
import { revealBitmapFromMapping } from '../../../common/src/utils/revealBitmap';
import { generateCircuitInputs } from '../../../common/src/utils/generateInputs';
import { formatProof, formatInputs } from '../../../common/src/utils/utils';
import { Steps } from './utils';
import { PassportData } from '../../../common/src/utils/types';
import * as amplitude from '@amplitude/analytics-react-native';

interface ProverProps {
  passportData: PassportData | null;
  disclosure: any;
  address: string;
  majority: number;
  setStep: (value: number) => void;
  setGeneratingProof: (value: boolean) => void;
  setProofTime: (value: number) => void;
  setProof: (value: { proof: string; inputs: string } | null) => void;
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
  setProof: (value: { proof: string; inputs: string } | null) => void,
  setGeneratingProof: (value: boolean) => void,
  setStep: (value: number) => void,
) => {
  try {
    console.log('launching generateProof function');
    console.log('inputs in App.tsx', inputs);

    const startTime = Date.now();
    const response = await NativeModules.Prover.runProveAction(inputs);
    const endTime = Date.now();
    console.log('time spent:', endTime - startTime);
    console.log('proof response:', response);
    console.log('typeof proof response:', typeof response);
    setProofTime(endTime - startTime);

    if (Platform.OS === 'android') {
      const parsedResponse = parseProofAndroid(response);
      const finalProof = {
        proof: JSON.stringify(formatProof(parsedResponse.proof)),
        inputs: JSON.stringify(formatInputs(parsedResponse.inputs)),
      };
      console.log('finalProof:', finalProof);

      setProof(finalProof);
      setGeneratingProof(false);
      setStep(Steps.PROOF_GENERATED);
    } else {
      const parsedResponse = JSON.parse(response);
      console.log('parsedResponse', parsedResponse);

      console.log('parsedResponse.proof:', parsedResponse.proof);
      console.log('parsedResponse.inputs:', parsedResponse.inputs);

      const finalProof = {
        proof: JSON.stringify(parsedResponse.proof),
        inputs: JSON.stringify(parsedResponse.inputs),
      };
      console.log('finalProof:', finalProof);

      setProof(finalProof);
      setGeneratingProof(false);
      setStep(Steps.PROOF_GENERATED);
    }
  } catch (err: any) {
    console.log('err', err);
  }
};

const parseProofAndroid = (response: any) => {
  const match = response.match(/GenerateProofResult\(proof=\[(.*?)\], inputs=\[(.*?)\]\)/);
  if (!match) throw new Error('Invalid input format');

  return {
    proof: match[1].split(',').map((n: any) => (parseInt(n.trim()) + 256) % 256),
    inputs: match[2].split(',').map((n: any) => (parseInt(n.trim()) + 256) % 256)
  };
};