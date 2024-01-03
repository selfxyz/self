import { ethers } from "hardhat";
import { countryCodes } from "../../common/src/constants/constants";
const fs = require('fs');
const path = require('path');

async function main() {
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  console.log(`Verifier deployed to ${verifier.target}`);

  const Formatter = await ethers.getContractFactory("Formatter");
  const formatter = await Formatter.deploy();
  await formatter.waitForDeployment();
  await formatter.addCountryCodes(Object.entries(countryCodes));

  console.log(`Formatter deployed to ${formatter.target}`);

  const ProofOfPassport = await ethers.getContractFactory("ProofOfPassport");
  const proofOfPassport = await ProofOfPassport.deploy(verifier.target, formatter.target);
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
