import { assert } from "chai";
import { ethers } from "hardhat";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { groth16 } from 'snarkjs'
import { revealBitmapFromMapping } from "../../common/src/utils/revealBitmap";
import { generateCircuitInputs } from "../../common/src/utils/generateInputs";
import { countryCodes } from "../../common/src/constants/constants";
import { formatRoot } from "../../common/src/utils/utils";
import fs from 'fs';

// Useful script to test formatting of tokenURI
async function main() {
  const passportData = mockPassportData_sha256WithRSAEncryption_65537;

  const attributeToReveal = {
    issuing_state: true,
    name: true,
    passport_number: true,
    nationality: true,
    date_of_birth: true,
    gender: true,
    expiry_date: true,
    older_than: true,
  }

  const reveal_bitmap = revealBitmapFromMapping(attributeToReveal)

  console.log('reveal_bitmap', reveal_bitmap);

  const address = "0xE6E4b6a802F2e0aeE5676f6010e0AF5C9CDd0a50";

  const inputs = generateCircuitInputs(
    passportData,
    reveal_bitmap,
    address,
    18,
  );

  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  console.log(`Verifier deployed to ${verifier.target}`);

  const Formatter = await ethers.getContractFactory("Formatter");
  const formatter = await Formatter.deploy();
  await formatter.waitForDeployment();
  console.log(`Formatter deployed to ${formatter.target}`);

  const tx = await formatter.addCountryCodes(Object.entries(countryCodes));
  await tx.wait();
  console.log(`Country codes added`);

  const Registry = await ethers.getContractFactory("Registry");
  const registry = await Registry.deploy(formatRoot(inputs.root[0]));
  await registry.waitForDeployment();
  console.log(`Registry deployed to ${registry.target}`);

  const OpenPassport = await ethers.getContractFactory("OpenPassport");
  const proofOfPassport = await OpenPassport.deploy(verifier.target, formatter.target, registry.target);
  await proofOfPassport.waitForDeployment();

  console.log(`OpenPassport NFT deployed to ${proofOfPassport.target}`);

  console.log('generating proof...');
  const { proof, publicSignals } = await groth16.fullProve(
    inputs,
    "../circuits/build/proof_of_passport_js/proof_of_passport.wasm",
    "../circuits/build/proof_of_passport_final.zkey"
  )

  console.log('proof done');

  const vKey = JSON.parse(fs.readFileSync("../circuits/build/proof_of_passport_vkey.json") as unknown as string);

  const verified = await groth16.verify(
    vKey,
    publicSignals,
    proof
  )

  assert(verified == true, 'Should verifiable')

  const cd = await groth16.exportSolidityCallData(proof, publicSignals);
  const callData = JSON.parse(`[${cd}]`);
  console.log('callData', callData);

  const mintTx = await proofOfPassport.mint(...callData);

  const receipt = await mintTx.wait();
  console.log('receipt', receipt?.hash);
  const tokenURI = await proofOfPassport.tokenURI(0);
  console.log('tokenURI', tokenURI);

  const decodedTokenURI = Buffer.from(tokenURI.split(',')[1], 'base64').toString();
  const parsedTokenURI = JSON.parse(decodedTokenURI)

  console.log('parsedTokenURI', parsedTokenURI);
  process.exit(0);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
