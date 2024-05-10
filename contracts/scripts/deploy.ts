import { ethers } from "hardhat";
import { PUBKEY_TREE_DEPTH, countryCodes } from "../../common/src/constants/constants";
import { formatRoot } from "../../common/src/utils/utils";
import { mockPassportData_sha256WithRSAEncryption_65537 } from "../../common/src/utils/mockPassportData";
import { poseidon2 } from 'poseidon-lite';
import { IMT } from '@zk-kit/imt';
import serializedTree from "../../common/pubkeys/serialized_tree.json";
import { getLeaf } from "../../common/src/utils/pubkeyTree";
const fs = require('fs');
const path = require('path');

const DEV_MODE = true

async function main() {
  const tree = new IMT(poseidon2, PUBKEY_TREE_DEPTH, 0, 2)
  tree.setNodes(serializedTree)
  
  // This adds the pubkey of the mock passportData to the registry so that it's always found for testing purposes.
  if (DEV_MODE) {
    tree.insert(getLeaf({
      signatureAlgorithm: mockPassportData_sha256WithRSAEncryption_65537.signatureAlgorithm,
      issuer: 'C = TS, O = Government of Syldavia, OU = Ministry of tests, CN = CSCA-TEST',
      modulus: mockPassportData_sha256WithRSAEncryption_65537.pubKey.modulus,
      exponent: mockPassportData_sha256WithRSAEncryption_65537.pubKey.exponent
    }).toString())
  }

  const root = formatRoot(tree.root)
  console.log('tree.root', tree.root)

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
  const registry = await Registry.deploy(root);
  await registry.waitForDeployment();
  console.log(`Registry deployed to ${registry.target}`);

  const ProofOfPassport = await ethers.getContractFactory("ProofOfPassport");
  const proofOfPassport = await ProofOfPassport.deploy(verifier.target, formatter.target, registry.target);
  await proofOfPassport.waitForDeployment();

  console.log(`ProofOfPassport NFT deployed to ${proofOfPassport.target}`);

  fs.mkdirSync(path.join(__dirname, "../../app/deployments"), { recursive: true });

  fs.copyFileSync(
    path.join(__dirname, '../artifacts/contracts/ProofOfPassport.sol/ProofOfPassport.json'),
    path.join(__dirname, '../../app/deployments/ProofOfPassport.json')
  );
  fs.copyFileSync(
    path.join(__dirname, '../artifacts/contracts/Verifier.sol/Groth16Verifier.json'),
    path.join(__dirname, '../../app/deployments/Groth16Verifier.json')
  );
  fs.writeFileSync(
    path.join(__dirname, '../../app/deployments/addresses.json'),
    JSON.stringify({
      ProofOfPassport: proofOfPassport.target,
      Groth16Verifier: verifier.target,
    })
  );
  console.log('Artifacts and addresses copied to ../app/deployments');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
