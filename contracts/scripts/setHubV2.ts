import { ethers } from "ethers";
import * as dotenv from "dotenv";
import {
  getDeployedAddresses,
  getContractAbi,
  getSavedRepo,
  getContractAddress,
  ATTESTATION_TO_REGISTRY,
  ATTESTATION_ID,
} from "./constants";

dotenv.config();

const setHubV2 = {
  E_PASSPORT: false,
  EU_ID_CARD: false,
};

const NETWORK = process.env.NETWORK;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!NETWORK) {
  throw new Error("One of the following parameter is null: NETWORK, RPC_URL, PRIVATE_KEY");
}

const repoName = getSavedRepo(NETWORK);
const deployedAddresses = getDeployedAddresses(repoName);
console.log("Network:", NETWORK);
console.log("Repo:", repoName);
console.log("Current directory:", __dirname);

try {
  console.log("Deployed addresses loaded:", deployedAddresses);
  const hubABI = getContractAbi(repoName, "DeployHubV2#IdentityVerificationHubImplV2");

  async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY as string, provider);
    console.log("Wallet created");

    const hubAddress = getContractAddress("DeployHubV2#IdentityVerificationHub", deployedAddresses) as string;

    console.log("Hub address:", hubAddress);

    if (!hubAddress) {
      console.error("Available contracts:", Object.keys(deployedAddresses));
      throw new Error("Hub address not found in deployed_addresses.json. Available contracts listed above.");
    }

    const identityVerificationHub = new ethers.Contract(hubAddress, hubABI, wallet);
    console.log("Contract instance created");

    const attestationTypes = ["E_PASSPORT", "EU_ID_CARD"] as const;
    for (const attestationType of attestationTypes) {
      if (setHubV2[attestationType]) {
        const registryName = ATTESTATION_TO_REGISTRY[attestationType] as any;
        console.log("registry name:", registryName);
        const registryAddress = getContractAddress(registryName, deployedAddresses);
        console.log("registry address:", registryAddress);

        if (!registryAddress) {
          console.log(`Skipping registry update for ${attestationType} because no deployed address was found.`);
          continue;
        }

        console.log(`Updating registry for ${attestationType}`);
        const attestationId = ATTESTATION_ID[attestationType];
        try {
          const tx = await identityVerificationHub.updateRegistry(attestationId, registryAddress);
          const receipt = await tx.wait();
          console.log(`Registry for ${attestationType} updated with tx: ${receipt.hash}`);
        } catch (error) {
          console.error(`Error updating registry for ${attestationType}:`, error);
        }
      } else {
        console.log(`Skipping registry update for ${attestationType}`);
      }
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
