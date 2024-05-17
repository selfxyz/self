import { ethers } from "ethers";
import axios from 'axios';
import groth16ExportSolidityCallData from '../../utils/snarkjs';
import contractAddresses from "../../deployments/deployed_addresses.json";
import registerArtefacts from "../../deployments/artifacts/Deploy_Registry#ProofOfPassportRegister.json";
import sbtArtefacts from "../../deployments/artifacts/Deploy_Registry#SBT.json";
import { CHAIN_NAME, RELAYER_URL, RPC_URL } from '../../../common/src/constants/constants';
import { Proof } from "../../../common/src/utils/types";
import { formatCallData_disclose, formatCallData_register } from "../../../common/src/utils/formatCallData";

export const sendRegisterTransaction = async (
  proof: Proof,
) => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  if (!contractAddresses["Deploy_Registry#ProofOfPassportRegister"] || !registerArtefacts.abi) {
    console.log('contracts addresses or abi not found');
    return;
  }

  // Format the proof and publicInputs as calldata for the verifier contract
  const cd = groth16ExportSolidityCallData(proof.proof, proof.pub_signals);
  const callData = JSON.parse(`[${cd}]`);
  console.log('callData', callData);

  const formattedCallData_register = formatCallData_register(callData)

  console.log('formattedCallData_register', formattedCallData_register);

  try {
    const registerContract = new ethers.Contract(
      contractAddresses["Deploy_Registry#ProofOfPassportRegister"],
      registerArtefacts.abi,
      provider
    );

    const transactionRequest = await registerContract
      .validateProof.populateTransaction(formattedCallData_register, 1);
    console.log('transactionRequest', transactionRequest);

    const response = await axios.post(RELAYER_URL, {
      chain: CHAIN_NAME,
      tx_data: transactionRequest
    });
    console.log('response status', response.status);
    console.log('response data', response.data);
    return response;
  } catch (err: any) {
    console.log('err', err);
    if (err.isAxiosError && err.response) {
      const errorMessage = err.response.data.error;
      console.log('Server error message:', errorMessage);

      // parse blockchain error and show it
      const match = errorMessage.match(/execution reverted: "([^"]*)"/);
      if (match && match[1]) {
        console.log('Parsed blockchain error:', match[1]);
        throw new Error(match[1]);
      } else {
        throw new Error(errorMessage);
      }
    }
  }
};

export const mintSBT = async (
  proof: Proof,
) => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  if (!contractAddresses["Deploy_Registry#SBT"] || !sbtArtefacts.abi) {
    console.log('contracts addresses or abi not found');
    return;
  }

  // Format the proof and publicInputs as calldata for the verifier contract
  const cd = groth16ExportSolidityCallData(proof.proof, proof.pub_signals);
  const parsedCallData_disclose = JSON.parse(`[${cd}]`);
  console.log('parsedCallData_disclose', parsedCallData_disclose);

  const formattedCallData_disclose = formatCallData_disclose(parsedCallData_disclose);
  
  try {
    const proofOfPassportContract = new ethers.Contract(
      contractAddresses["Deploy_Registry#SBT"],
      sbtArtefacts.abi,
      provider
    );

    const transactionRequest = await proofOfPassportContract
      .mint.populateTransaction(formattedCallData_disclose);
    console.log('transactionRequest', transactionRequest);

    const response = await axios.post(RELAYER_URL, {
      chain: CHAIN_NAME,
      tx_data: transactionRequest
    });
    console.log('response status', response.status);
    console.log('response data', response.data);
    return response;
  } catch (err: any) {
    console.log('err', err);
    if (err.isAxiosError && err.response) {
      const errorMessage = err.response.data.error;
      console.log('Server error message:', errorMessage);

      // parse blockchain error and show it
      const match = errorMessage.match(/execution reverted: "([^"]*)"/);
      if (match && match[1]) {
        console.log('Parsed blockchain error:', match[1]);
        throw new Error(match[1]);
      } else {
        throw new Error(errorMessage);
      }
    }
  }
};