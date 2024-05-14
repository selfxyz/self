import { ethers } from "ethers";
import axios from 'axios';
import groth16ExportSolidityCallData from '../../utils/snarkjs';
import contractAddresses from "../../deployments/addresses.json";
import proofOfPassportArtefact from "../../deployments/ProofOfPassport.json";
import { RELAYER_URL } from '../../../common/src/constants/constants';
import { Proof } from "../../../common/src/utils/types";

export const mintSBT = async (
  proof: Proof,
  provider: ethers.JsonRpcProvider,
  chainName: string
) => {
  if (!contractAddresses.ProofOfPassport || !proofOfPassportArtefact.abi) {
    console.log('contracts addresses or abi not found');
    return;
  }

  // Format the proof and publicInputs as calldata for the verifier contract
  const cd = groth16ExportSolidityCallData(proof.proof, proof.pub_signals);
  const callData = JSON.parse(`[${cd}]`);
  console.log('callData', callData);

  try {
    const proofOfPassportContract = new ethers.Contract(
      contractAddresses.ProofOfPassport,
      proofOfPassportArtefact.abi,
      provider
    );

    const transactionRequest = await proofOfPassportContract
      .mint.populateTransaction(...callData);
    console.log('transactionRequest', transactionRequest);

    const response = await axios.post(RELAYER_URL, {
      chain: chainName,
      tx_data: transactionRequest
    });
    console.log('response status', response.status);
    console.log('response data', response.data);
    return response;
  } catch (err: any) {
    console.log('err', err);
    throw new Error(err);
  }
};