import { NativeModules, Platform } from 'react-native';
import { parseProofAndroid } from './utils';
import RNFS from 'react-native-fs';

export const generateProof = async (
  circuit: string,
  inputs: any,
) => {
  try {
    console.log('launching generateProof function');
    console.log('inputs in App.tsx', inputs);

    const zkey_path = `${RNFS.DocumentDirectoryPath}/${circuit}.zkey`
    // Example: "/data/user/0/com.proofofpassport/files/register_sha256WithRSAEncryption_65537.zkey" on android
    const witness_calculator = circuit;
    const dat_file_name = circuit.toLowerCase();

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
      console.log('parsedResponse.proof:', parsedResponse.proof);
      console.log('parsedResponse.inputs:', parsedResponse.inputs);

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