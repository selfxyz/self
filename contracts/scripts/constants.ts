import * as path from "path";
import * as fs from "fs";

export const ATTESTATION_ID = {
  E_PASSPORT: "0x0000000000000000000000000000000000000000000000000000000000000001",
  EU_ID_CARD: "0x0000000000000000000000000000000000000000000000000000000000000002",
};

export const ATTESTATION_TO_REGISTRY = {
  E_PASSPORT: "DeployRegistryModule#IdentityRegistry",
  EU_ID_CARD: "DeployIdCardRegistryModule#IdentityRegistry",
};

export const NETWORK_TO_CHAIN_ID: Record<string, string> = {
  localhost: "31337",
  hardhat: "31337",
  celoSepolia: "11142220",
  celo: "42220",
  mainnet: "42220",
  staging: "11142220",
};

export const CHAIN_ID_TO_SAVED_REPO: Record<string, string> = {
  "42220": "prod",
  "11142220": "staging",
};

export const getChainId = (network: string): string => {
  const chainId = NETWORK_TO_CHAIN_ID[network];
  console.log(`Network '${network}' mapped to Chain ID: ${chainId}`);
  return chainId;
};

export const getSavedRepo = (network: string): string => {
  const repoName = CHAIN_ID_TO_SAVED_REPO[NETWORK_TO_CHAIN_ID[network]];
  return repoName;
};

export const getDeployedAddresses = (repoName: string): any => {
  const addresses_path = path.join(__dirname, `../ignition/deployments/${repoName}/deployed_addresses.json`);
  return JSON.parse(fs.readFileSync(addresses_path, "utf-8"));
};
export const getContractAbi = (repoName: string, deploymentArtifactName: string): any => {
  const abi_path = path.join(__dirname, `../ignition/deployments/${repoName}/artifacts/${deploymentArtifactName}.json`);
  return JSON.parse(fs.readFileSync(abi_path, "utf-8")).abi;
};

export function getContractAddress(exactName: string, deployedAddresses: any): any {
  if (exactName in deployedAddresses) {
    return deployedAddresses[exactName];
  }
  throw Error(`No contract address found for ${exactName}`);
}

// Console colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export const log = {
  info: (msg: string) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.magenta}[STEP]${colors.reset} ${msg}`),
};
