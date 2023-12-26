import { ethers } from "hardhat";

async function main() {
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  console.log(`Verifier deployed to ${verifier.target}`);

  const ProofOfPassport = await ethers.getContractFactory("ProofOfPassport");
  const proofOfPassport = await ProofOfPassport.deploy(verifier.target);
  await proofOfPassport.waitForDeployment();

  console.log(`ProofOfPassport NFT deployed to ${proofOfPassport.target}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
