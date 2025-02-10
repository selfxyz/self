import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { verifyAllAbi } from '../src/abi/VerifyAll';
import {groth16} from 'snarkjs';
import dotenv from 'dotenv';
import { pid } from 'process';
import { generateVcAndDiscloseProof } from '../../../contracts/test/utils/generateProof';
import { ATTESTATION_ID } from '../../../contracts/test/utils/constants';
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  const deployedAddresses = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/contractAddress/chain-11155111_deployed_addresses.json'), 'utf8'));
  const verifyAllAddress = deployedAddresses["DeployVerifyAll#VerifyAll"];
  console.log(`Using verifyAll contract at address: ${verifyAllAddress}`);

  const verifyAllContract = new ethers.Contract(verifyAllAddress, verifyAllAbi, provider);

  const registerSecret = "0x0000000000000000000000000000000000000000000000000000000000000000";


  const proof = await generateVcAndDiscloseProof(
    registerSecret,
    BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
    mockPassport,
    "test-scope",
    new Array(88).fill("1"),
    "1",
    imt,
    "20",
    undefined,
    undefined,
    forbiddenCountriesList,
    (await deployedActors.user1.getAddress()).slice(2)
);

  try {
    const result = await verifyAllContract.verifyAll(
        "0x0000000000000000000000000000000000000000000000000000000000000000", 
        {
            olderThanEnabled: true,
            olderThan: "20",
            forbiddenCountriesEnabled: true,
            forbiddenCountriesListPacked: "0x0000000000000000000000000000000000000000000000000000000000000000",
            ofacEnabled: true,
            vcAndDiscloseProof: [
                proof.a,
                proof.b,
                proof.c,
                proof.pubSignals
            ]
        }, 
        ["0"]
    );
    console.log('Result:', result);
  } catch (err) {
    console.error('Error calling contract function:', err);
  }
}

main().catch(console.error);