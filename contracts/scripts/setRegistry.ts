import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
// import { getCscaTreeRoot } from "../../common/src/utils/trees";
// import serialized_csca_tree from "../../common/pubkeys/serialized_csca_tree.json";

dotenv.config();

// Environment configuration
const NETWORK = process.env.NETWORK || "localhost"; // Default to localhost
const RPC_URL_KEY = NETWORK === "celo" ? "CELO_RPC_URL" : "CELO_SEPOLIA_RPC_URL";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SKIP_CSCA_UPDATE = process.env.SKIP_CSCA_UPDATE === "true";
const CSCA_ROOT = process.env.CSCA_ROOT; // Allow manual CSCA root setting

// Network to Chain ID mapping
const NETWORK_TO_CHAIN_ID: Record<string, string> = {
  localhost: "31337",
  celoSepolia: "11142220",
  celo: "42220",
};

// Get chain ID from network name
const getChainId = (network: string): string => {
  return NETWORK_TO_CHAIN_ID[network] || NETWORK_TO_CHAIN_ID["localhost"];
};

const CHAIN_ID = getChainId(NETWORK);

// Dynamic paths based on chain ID
const deployedAddressesPath = path.join(__dirname, `../ignition/deployments/chain-${CHAIN_ID}/deployed_addresses.json`);
const contractAbiPath = path.join(
  __dirname,
  `../ignition/deployments/chain-${CHAIN_ID}/artifacts/DeployRegistryModule#IdentityRegistryImplV1.json`,
);

// Debug logs for paths and files
console.log("Network:", NETWORK);
console.log("Chain ID:", CHAIN_ID);
console.log("Current directory:", __dirname);
console.log("Deployed addresses path:", deployedAddressesPath);
console.log("Contract ABI path:", contractAbiPath);

// Debug logs for environment variables (redacted for security)
console.log(`${RPC_URL_KEY} configured:`, !!process.env[RPC_URL_KEY]);
console.log("PRIVATE_KEY configured:", !!PRIVATE_KEY);

try {
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf-8"));
  console.log("Deployed addresses loaded:", deployedAddresses);

  const identityRegistryAbiFile = fs.readFileSync(contractAbiPath, "utf-8");
  console.log("Registry ABI file loaded");

  const identityRegistryAbi = JSON.parse(identityRegistryAbiFile).abi;
  console.log("Registry ABI parsed");

  function getContractAddressByExactName(exactName: string): string | unknown {
    if (exactName in deployedAddresses) {
      return deployedAddresses[exactName];
    }
    return undefined;
  }

  async function main() {
    const provider = new ethers.JsonRpcProvider(process.env[RPC_URL_KEY] as string);
    console.log("Provider created");

    const wallet = new ethers.Wallet(PRIVATE_KEY as string, provider);
    console.log("Wallet created");

    // Get registry address
    const registryAddress = getContractAddressByExactName("DeployRegistryModule#IdentityRegistry");
    console.log("Registry address:", registryAddress);

    if (!registryAddress) {
      throw new Error("Registry address not found in deployed_addresses.json");
    }

    // Get hub address
    const hubAddress = getContractAddressByExactName("DeployHubV2#IdentityVerificationHubImplV2");
    console.log("Hub address:", hubAddress);

    if (!hubAddress) {
      throw new Error("Hub address not found in deployed_addresses.json");
    }

    const identityRegistry = new ethers.Contract(registryAddress as string, identityRegistryAbi, wallet);
    console.log("Registry contract instance created");

    // Update hub address
    console.log("Updating hub address...");
    try {
      const tx1 = await identityRegistry.updateHub(hubAddress);
      const receipt1 = await tx1.wait();
      console.log(`Hub address updated with tx: ${receipt1.hash}`);
    } catch (error) {
      console.error("Error updating hub address:", error);
    }

    // Update CSCA root
    console.log("Updating CSCA root...");
    try {
      if (SKIP_CSCA_UPDATE) {
        console.log("Skipping CSCA root update as per configuration");
        return;
      }

      if (!CSCA_ROOT) {
        console.log("CSCA_ROOT environment variable not set, skipping CSCA root update");
        console.log("To set CSCA root, use: CSCA_ROOT=<your_root_value> npm run set:registry");
        return;
      }

      console.log("CSCA Merkle root:", CSCA_ROOT);

      const tx2 = await identityRegistry.updateCscaRoot(CSCA_ROOT);
      const receipt2 = await tx2.wait();
      console.log(`CSCA root updated with tx: ${receipt2.hash}`);
    } catch (error) {
      console.error("Error updating CSCA root:", error);
    }

    console.log("Registry setup completed successfully!");
  }

  main().catch((error) => {
    console.error("Execution error:", error);
    process.exitCode = 1;
  });
} catch (error) {
  console.error("Initial setup error:", error);
  process.exitCode = 1;
}
