import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { DataHash } from "../../common/src/utils/types";
import { getPassportData } from "../../common/src/utils/passportData";
import { attributeToPosition } from "../../common/src/constants/constants";
import { formatMrz, splitToWords, formatAndConcatenateDataHashes, toUnsignedByte, hash, bytesToBigDecimal } from "../../common/src/utils/utils";
import { groth16 } from 'snarkjs'
const fs = require('fs');

async function main() {
  const proofOfPassportAddress = "0x64BfefF18335E3cac8cF8f8E37Ac921371d9c5aa"
  const proofOfPassport = await ethers.getContractAt("ProofOfPassport", proofOfPassportAddress);

  const passportData = getPassportData();

  const formattedMrz = formatMrz(passportData.mrz);
  const mrzHash = hash(formatMrz(passportData.mrz));
  const concatenatedDataHashes = formatAndConcatenateDataHashes(
    mrzHash,
    passportData.dataGroupHashes as DataHash[],
  );

  const attributeToReveal = {
    issuing_state: true,
    name: true,
    passport_number: true,
    nationality: true,
    date_of_birth: true,
    gender: true,
    expiry_date: true,
  }

  const bitmap = Array(88).fill('0');

  Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
    if (reveal) {
      const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
      bitmap.fill('1', start, end + 1);
    }
  });

  const inputs = {
    mrz: formattedMrz.map(byte => String(byte)),
    reveal_bitmap: bitmap.map(byte => String(byte)),
    dataHashes: concatenatedDataHashes.map(toUnsignedByte).map(byte => String(byte)),
    eContentBytes: passportData.eContent.map(toUnsignedByte).map(byte => String(byte)),
    pubkey: splitToWords(
      BigInt(passportData.pubKey.modulus as string),
      BigInt(64),
      BigInt(32)
    ),
    signature: splitToWords(
      BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
      BigInt(64),
      BigInt(32)
    ),
    address: "0x9D392187c08fc28A86e1354aD63C70897165b982", // goerli test account
  }

  console.log('generating proof...');
  const { proof, publicSignals } = await groth16.fullProve(
    inputs,
    "../circuits/build/proof_of_passport_js/proof_of_passport.wasm",
    "../circuits/build/proof_of_passport_final.zkey"
  )

  console.log('proof done');

  const vKey = JSON.parse(fs.readFileSync("../circuits/build/verification_key.json"));
  const verified = await groth16.verify(
    vKey,
    publicSignals,
    proof
  )

  assert(verified == true, 'Should verifiable')

  const cd = await groth16.exportSolidityCallData(proof, publicSignals);
  const callData = JSON.parse(`[${cd}]`);
  console.log('callData', callData);

  const tx = await proofOfPassport.mint(...callData);

  const receipt = await tx.wait();
  console.log('receipt', receipt?.hash);
  const tokenURI = await proofOfPassport.tokenURI(0);
  console.log('tokenURI', tokenURI);

}


main()