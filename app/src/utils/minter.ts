import { ethers } from "ethers";
import axios from 'axios';
import groth16ExportSolidityCallData from '../../utils/snarkjs';
import contractAddresses from "../../deployments/addresses.json";
import proofOfPassportArtefact from "../../deployments/ProofOfPassport.json";
import { Steps } from './utils';
import { AWS_ENDPOINT } from '../../../common/src/constants/constants';

interface MinterProps {
  proof: { proof: string; inputs: string } | null;
  setStep: (value: number) => void;
  setMintText: (value: string) => void;
  toast: any
}

export const mint = async ({ proof, setStep, setMintText, toast }: MinterProps) => {
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
    console.log('response status', response.status);
    console.log('response data', response.data);
    setMintText(`Network: Sepolia. Transaction hash: ${response.data.hash}`);

    const receipt = await provider.waitForTransaction(response.data.hash);
    console.log('receipt status:', receipt?.status);

    if (receipt?.status === 1) {
      toast.show('🎊', {
        message: "SBT minted",
        customData: {
          type: "success",
        },
      })
      setMintText(`SBT minted. Network: Sepolia. Transaction hash: ${response.data.hash}`);
      setStep(Steps.TX_MINTED);
    } else {
      toast.show('Error', {
        message: "Proof of passport minting failed",
        customData: {
          type: "error",
        },
      })
      setMintText(`Error minting SBT. Network: Sepolia. Transaction hash: ${response.data.hash}`);
      setStep(Steps.PROOF_GENERATED);
    }
  } catch (err: any) {
    console.log('err', err);
    setStep(Steps.PROOF_GENERATED);
    setMintText(`Error minting SBT. Network: Sepolia.`);
    if (err.isAxiosError && err.response) {
      const errorMessage = err.response.data.error;
      console.log('Server error message:', errorMessage);

      // parse blockchain error and show it
      const match = errorMessage.match(/execution reverted: "([^"]*)"/);
      if (match && match[1]) {
        console.log('Parsed blockchain error:', match[1]);
        toast.show('Error', {
          message: `Error: ${match[1]}`,
          customData: {
            type: "error",
          },
        })
      } else {
        toast.show('Error', {
          message: `Error: mint failed`,
          customData: {
            type: "error",
          },
        })
        console.log('Failed to parse blockchain error');
      }
    }
  }
};