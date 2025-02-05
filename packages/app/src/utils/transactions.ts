import {
  CHAIN_NAME,
  RELAYER_URL,
  RPC_URL,
  SignatureAlgorithmIndex,
} from '@openpassport/common/constants/constants';
import {
  formatCallData_disclose,
  formatCallData_dsc,
  formatCallData_register,
} from '@openpassport/common/utils/formatCallData';
import { Proof } from '@openpassport/common/utils/types';
import axios from 'axios';
import { ethers } from 'ethers';

import registerArtefacts from '../../deployments/artifacts/Deploy_Registry#OpenPassportRegister.json';
import sbtArtefacts from '../../deployments/artifacts/Deploy_Registry#SBT.json';
import contractAddresses from '../../deployments/deployed_addresses.json';
import groth16ExportSolidityCallData from './snarkjs';

export const sendRegisterTransaction = async (
  proof: Proof,
  cscaProof: Proof,
  sigAlgIndex: SignatureAlgorithmIndex,
) => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  if (
    !contractAddresses['Deploy_Registry#OpenPassportRegister'] ||
    !registerArtefacts.abi
  ) {
    console.log('contracts addresses or abi not found');
    return;
  }

  // Format the proof and publicInputs as calldata for the verifier contract
  //console.log("exporting local proof:", proof, proof.proof, proof.pub_signals);
  const cd = groth16ExportSolidityCallData(proof.proof, proof.pub_signals);
  const callData = JSON.parse(`[${cd}]`);
  //console.log('callData', callData);
  const formattedCallData_register = formatCallData_register(callData);
  console.log('formattedCallData_register', formattedCallData_register);

  //console.log("exporting csca proof", cscaProof, cscaProof.proof, cscaProof.pub_signals)
  const cd_csca = groth16ExportSolidityCallData(
    cscaProof.proof,
    cscaProof.pub_signals,
  );
  const callData_csca = JSON.parse(`[${cd_csca}]`);
  //console.log('callData_csca', callData_csca);
  const formattedCallData_csca = formatCallData_dsc(callData_csca);
  console.log('formattedCallData_csca', formattedCallData_csca);

  try {
    const registerContract = new ethers.Contract(
      contractAddresses['Deploy_Registry#OpenPassportRegister'],
      registerArtefacts.abi,
      provider,
    );

    const transactionRequest =
      await registerContract.validateProof.populateTransaction(
        formattedCallData_register,
        formattedCallData_csca,
        sigAlgIndex,
        sigAlgIndex,
      );
    console.log('transactionRequest', transactionRequest);

    const response = await axios.post(RELAYER_URL, {
      chain: CHAIN_NAME,
      tx_data: transactionRequest,
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

export const mintSBT = async (proof: Proof) => {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  if (!contractAddresses['Deploy_Registry#SBT'] || !sbtArtefacts.abi) {
    console.log('contracts addresses or abi not found');
    return;
  }

  // Format the proof and publicInputs as calldata for the verifier contract
  const cd = groth16ExportSolidityCallData(proof.proof, proof.pub_signals);
  const parsedCallData_disclose = JSON.parse(`[${cd}]`);
  console.log('parsedCallData_disclose', parsedCallData_disclose);

  const formattedCallData_disclose = formatCallData_disclose(
    parsedCallData_disclose,
  );

  try {
    const proofOfPassportContract = new ethers.Contract(
      contractAddresses['Deploy_Registry#SBT'],
      sbtArtefacts.abi,
      provider,
    );

    const transactionRequest =
      await proofOfPassportContract.mint.populateTransaction(
        formattedCallData_disclose,
      );
    console.log('transactionRequest', transactionRequest);

    const response = await axios.post(RELAYER_URL, {
      chain: CHAIN_NAME,
      tx_data: transactionRequest,
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
