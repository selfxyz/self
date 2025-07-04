import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { RegisterVerifierId, DscVerifierId } from "../../common/src/constants/constants";

dotenv.config();

// Debug logs for paths and files
console.log("Current directory:", __dirname);
console.log(
  "Deployed addresses path:",
  path.join(__dirname, "../ignition/deployments/chain-42220/deployed_addresses.json"),
);
console.log(
  "Contract ABI path:",
  path.join(__dirname, "../ignition/deployments/chain-42220/artifacts/DeployHub#IdentityVerificationHubImplV1.json"),
);

// Debug logs for environment variables (redacted for security)
console.log("CELO_RPC_URL configured:", !!process.env.CELO_RPC_URL);
console.log("PRIVATE_KEY configured:", !!process.env.PRIVATE_KEY);

try {
  const deployedAddresses = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../ignition/deployments/chain-42220/deployed_addresses.json"), "utf-8"),
  );
  console.log("Deployed addresses loaded:", deployedAddresses);

  const identityVerificationHubAbiFile = fs.readFileSync(
    path.join(__dirname, "../ignition/deployments/prod/artifacts/DeployHub#IdentityVerificationHubImplV1.json"),
    "utf-8",
  );
  console.log("ABI file loaded");

  const identityVerificationHubAbi = JSON.parse(identityVerificationHubAbiFile).abi;
  console.log("ABI parsed");

  const contractAbiPath = path.join(__dirname, "../ignition/deployments/chain-11155111/artifacts");

  function getContractAddressByPartialName(partialName: string): string | unknown {
    for (const [key, value] of Object.entries(deployedAddresses)) {
      if (key.includes(partialName)) {
        return value;
      }
    }
    return undefined;
  }

  async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL as string);
    console.log("Provider created");

    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);
    console.log("Wallet created");

    // const hubAddress = deployedAddresses["DeployHub#IdentityVerificationHub"];
    const hubAddress = "0x77117D60eaB7C044e785D68edB6C7E0e134970Ea";
    console.log("Hub address:", hubAddress);

    if (!hubAddress) {
      throw new Error("Hub address not found in deployed_addresses.json");
    }

    const identityVerificationHub = new ethers.Contract(hubAddress, identityVerificationHubAbi, wallet);
    console.log("Contract instance created");

    // Debug verifier addresses before updating
    const registerVerifierKeys = Object.keys(RegisterVerifierId).filter((key) => isNaN(Number(key)));
    for (const key of registerVerifierKeys) {
      const verifierName = `Verifier_${key}`;
      const verifierAddress = getContractAddressByPartialName(verifierName);
      console.log(`${verifierName} address:`, verifierAddress);
    }

    for (const key of registerVerifierKeys) {
      const verifierName = `Verifier_${key}`;
      const verifierAddress = getContractAddressByPartialName(verifierName);
      if (!verifierAddress) {
        console.log(`Skipping ${verifierName} because no deployed address was found.`);
        continue;
      }
      console.log(`Updating for ${verifierName}`);
      const verifierId = RegisterVerifierId[key as keyof typeof RegisterVerifierId];

      try {
        const tx = await identityVerificationHub.updateRegisterCircuitVerifier(verifierId, verifierAddress);
        const receipt = await tx.wait();
        console.log(`${verifierName} is updated with tx: ${receipt.hash}`);
      } catch (error) {
        console.error(`Error updating ${verifierName}:`, error);
      }
    }

    const dscKeys = Object.keys(DscVerifierId).filter((key) => isNaN(Number(key)));
    for (const key of dscKeys) {
      const verifierName = `Verifier_${key}`;
      const verifierAddress = getContractAddressByPartialName(verifierName);
      if (!verifierAddress) {
        console.log(`Skipping ${verifierName} because no deployed address was found.`);
        continue;
      }
      const verifierId = DscVerifierId[key as keyof typeof DscVerifierId];

      const tx = await identityVerificationHub.updateDscVerifier(verifierId, verifierAddress);
      const receipt = await tx.wait();
      console.log(`${verifierName} is updated wit this tx: ${receipt.hash}`);
    }
  }

  main().catch((error) => {
    console.error("Execution error:", error);
    process.exitCode = 1;
  });
} catch (error) {
  console.error("Initial setup error:", error);
  process.exitCode = 1;
}
