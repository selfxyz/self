import { NativeModules, Platform } from 'react-native';
import { parseProofAndroid } from './utils';
import RNFS from 'react-native-fs';

export const generateProof = async (
  circuit: string,
  inputs: any,
) => {
  try {
    console.log('launching generateProof function');
    console.log('inputs in prover.ts', inputs);
    console.log('circuit', circuit);

    const zkey_path = `${RNFS.DocumentDirectoryPath}/${circuit}.zkey`
    // Example: "/data/user/0/com.proofofpassportapp/files/register_sha256WithRSAEncryption_65537.zkey" on android
    const witness_calculator = circuit;
    const dat_file_name = Platform.OS == "android" ? circuit.toLowerCase() : circuit;

    if (!zkey_path || !witness_calculator || !dat_file_name) {
      throw new Error('Required parameters are missing');
    }
    console.log('zkey_path', zkey_path);
    console.log('witness_calculator', witness_calculator);
    console.log('dat_file_name', dat_file_name);
    const response = await NativeModules.Prover.runProveAction(
      zkey_path,
      witness_calculator,
      dat_file_name,
      inputs
    );

    console.log('proof response:', response);

    if (Platform.OS === 'android') {
      const parsedResponse = parseProofAndroid(response);
      console.log('parsedResponse', parsedResponse);
      return parsedResponse
    } else {
      const parsedResponse = JSON.parse(response);
      console.log('parsedResponse', parsedResponse);

      return {
        proof: parsedResponse.proof,
        pub_signals: parsedResponse.inputs,
      }
    }
  } catch (err: any) {
    console.log('err', err);
    throw new Error(err);
  }
};

export const formatProof = (rawProof: any) => {
  return {
    proof: {
      pi_a: [
        rawProof.proof.a[0],
        rawProof.proof.a[1],
        "1"
      ],
      pi_b: [
        [rawProof.proof.b[0][0], rawProof.proof.b[0][1]],
        [rawProof.proof.b[1][0], rawProof.proof.b[1][1]],
        ["1", "0"]
      ],
      pi_c: [
        rawProof.proof.c[0],
        rawProof.proof.c[1],
        "1"
      ],
      protocol: "groth16",
      curve: "bn128"
    },
    publicSignals: (rawProof as any).pub_signals
  }
}