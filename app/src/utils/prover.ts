import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';

import useNavigationStore from '../stores/navigationStore';
import { parseProofAndroid } from './utils';

export const generateProof = async (circuit: string, inputs: any) => {
  const startTime = Date.now();
  const { trackEvent } = useNavigationStore.getState();

  trackEvent('Proof Started', {
    success: true,
    circuit: circuit,
  });

  const zkey_path = `${RNFS.DocumentDirectoryPath}/${circuit}.zkey`;
  const dat_path = `${RNFS.DocumentDirectoryPath}/${circuit}.dat`;
  const witness_calculator = circuit;

  if (!zkey_path || !witness_calculator || !dat_path) {
    trackEvent('Proof Failed', {
      success: false,
      error: 'Required parameters are missing',
      circuit: circuit,
    });
    throw new Error('Required parameters are missing');
  }

  try {
    const response = await NativeModules.Prover.runProveAction(
      zkey_path,
      witness_calculator,
      dat_path,
      inputs,
    );

    if (Platform.OS === 'android') {
      const parsedResponse = parseProofAndroid(response);

      trackEvent('Proof Generated', {
        success: true,
        duration_ms: Date.now() - startTime,
        circuit: circuit,
      });

      return formatProof(parsedResponse);
    } else {
      const parsedResponse = JSON.parse(response);

      trackEvent('Proof Generated', {
        success: true,
        duration_ms: Date.now() - startTime,
        circuit: circuit,
      });

      return formatProof({
        proof: parsedResponse.proof,
        pub_signals: parsedResponse.inputs,
      });
    }
  } catch (err: any) {
    trackEvent('Proof Failed', {
      success: false,
      error: err.message,
      duration_ms: Date.now() - startTime,
      circuit: circuit,
      zkey_path: zkey_path,
      witness_calculator: witness_calculator,
      dat_path: dat_path,
    });

    throw new Error(err);
  }
};

export const formatProof = (rawProof: any): any => {
  const { trackEvent } = useNavigationStore.getState();
  try {
    const formattedProof = {
      proof: {
        pi_a: [rawProof.proof.a[0], rawProof.proof.a[1], '1'],
        pi_b: [
          [rawProof.proof.b[0][0], rawProof.proof.b[0][1]],
          [rawProof.proof.b[1][0], rawProof.proof.b[1][1]],
          ['1', '0'],
        ],
        pi_c: [rawProof.proof.c[0], rawProof.proof.c[1], '1'],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicSignals: (rawProof as any).pub_signals,
    };
    trackEvent('Proof Formatted', {
      success: true,
    });

    return formattedProof;
  } catch (err: any) {
    trackEvent('Proof FormatFailed', {
      success: false,
      error: err.message,
    });
    throw err;
  }
};
