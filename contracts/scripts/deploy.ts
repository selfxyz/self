import { ethers } from "hardhat";
import { TREE_DEPTH, countryCodes } from "../../common/src/constants/constants";
import { formatRoot } from "../../common/src/utils/utils";
import { poseidon2 } from 'poseidon-lite';
import { IMT } from '@zk-kit/imt';

const fs = require('fs');
const path = require('path');

async function main() {
  const serializedTree = JSON.parse(fs.readFileSync("../app/deployments/serialized_tree.json") as unknown as string)
  const tree = new IMT(poseidon2, TREE_DEPTH, 0, 2)
  tree.setNodes(serializedTree)

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
