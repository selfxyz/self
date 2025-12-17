/**
 * Utility functions for upgrade tooling
 *
 * Works with the new registry structure:
 * - contracts: Contract definitions (source, type, description)
 * - networks: Per-network deployments and governance
 * - versions: Version history with deployment details
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { SupportedNetwork } from "./types";

// Registry types matching the new structure
export interface ContractDefinition {
  source: string;
  type: "uups-proxy" | "non-upgradeable";
  description: string;
}

export interface NetworkDeployment {
  proxy?: string;
  address?: string;
  currentVersion: string;
  currentImpl?: string;
}

export interface GovernanceConfig {
  securityMultisig: string;
  operationsMultisig: string;
  securityThreshold: string;
  operationsThreshold: string;
}

export interface NetworkConfig {
  chainId: number;
  governance: GovernanceConfig;
  deployments: Record<string, NetworkDeployment>;
}

export interface VersionDeployment {
  impl: string;
  deployedAt: string;
  deployedBy: string;
  gitCommit: string;
}

export interface VersionInfo {
  initializerVersion: number;
  initializerFunction: string;
  changelog: string;
  gitTag: string;
  deployments: Record<string, VersionDeployment>;
}

export interface DeploymentRegistry {
  $schema: string;
  lastUpdated: string;
  contracts: Record<string, ContractDefinition>;
  networks: Record<string, NetworkConfig>;
  versions: Record<string, Record<string, VersionInfo>>;
}

// Console colors for pretty output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

export const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`\n${colors.magenta}🔄${colors.reset} ${colors.bold}${msg}${colors.reset}`),
  header: (msg: string) =>
    console.log(
      `\n${colors.cyan}${"═".repeat(70)}${colors.reset}\n${colors.bold}${msg}${colors.reset}\n${colors.cyan}${"═".repeat(70)}${colors.reset}`,
    ),
  detail: (label: string, value: string) => console.log(`   ${colors.gray}${label}:${colors.reset} ${value}`),
  box: (lines: string[]) => {
    const maxLen = Math.max(...lines.map((l) => l.length));
    console.log(`\n┌${"─".repeat(maxLen + 2)}┐`);
    lines.forEach((line) => console.log(`│ ${line.padEnd(maxLen)} │`));
    console.log(`└${"─".repeat(maxLen + 2)}┘\n`);
  },
};

/**
 * Get the path to the deployment registry
 */
export function getRegistryPath(): string {
  return path.join(__dirname, "../../deployments/registry.json");
}

/**
 * Read the deployment registry
 */
export function readRegistry(): DeploymentRegistry {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Deployment registry not found at ${registryPath}`);
  }
  return JSON.parse(fs.readFileSync(registryPath, "utf-8"));
}

/**
 * Write the deployment registry
 */
export function writeRegistry(registry: DeploymentRegistry): void {
  const registryPath = getRegistryPath();
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
}

/**
 * Get contract definition from registry
 */
export function getContractDefinition(contractId: string): ContractDefinition {
  const registry = readRegistry();
  const contract = registry.contracts[contractId];
  if (!contract) {
    throw new Error(`Contract '${contractId}' not found in registry`);
  }
  return contract;
}

/**
 * Get network config
 */
export function getNetworkConfig(network: SupportedNetwork): NetworkConfig {
  const registry = readRegistry();
  const networkConfig = registry.networks[network];
  if (!networkConfig) {
    throw new Error(`Network '${network}' not configured in registry`);
  }
  return networkConfig;
}

/**
 * Get deployment for a contract on a network
 */
export function getNetworkDeployment(contractId: string, network: SupportedNetwork): NetworkDeployment | null {
  const registry = readRegistry();
  return registry.networks[network]?.deployments?.[contractId] || null;
}

/**
 * Get proxy address for a contract on a network
 */
export function getProxyAddress(contractId: string, network: SupportedNetwork): string {
  const deployment = getNetworkDeployment(contractId, network);
  if (!deployment?.proxy) {
    throw new Error(`No proxy address found for '${contractId}' on network '${network}'`);
  }
  return deployment.proxy;
}

/**
 * Get current version for a contract on a network
 */
export function getCurrentVersion(contractId: string, network: SupportedNetwork): string {
  const deployment = getNetworkDeployment(contractId, network);
  return deployment?.currentVersion || "0.0.0";
}

/**
 * Get governance config for a network
 */
export function getGovernanceConfig(network: SupportedNetwork): GovernanceConfig {
  const networkConfig = getNetworkConfig(network);
  return networkConfig.governance;
}

/**
 * Get version info from registry
 */
export function getVersionInfo(contractId: string, version: string): VersionInfo | null {
  const registry = readRegistry();
  return registry.versions[contractId]?.[version] || null;
}

/**
 * Get latest version info for a contract
 */
export function getLatestVersionInfo(contractId: string): { version: string; info: VersionInfo } | null {
  const registry = readRegistry();
  const versions = registry.versions[contractId];
  if (!versions) return null;

  const versionNumbers = Object.keys(versions).sort((a, b) => compareVersions(b, a));
  if (versionNumbers.length === 0) return null;

  return { version: versionNumbers[0], info: versions[versionNumbers[0]] };
}

/**
 * Add new version to registry
 */
export function addVersion(
  contractId: string,
  network: SupportedNetwork,
  version: string,
  versionInfo: Omit<VersionInfo, "deployments">,
  deployment: VersionDeployment,
): void {
  const registry = readRegistry();

  // Initialize versions object if needed
  if (!registry.versions[contractId]) {
    registry.versions[contractId] = {};
  }

  // Add or update version info
  if (!registry.versions[contractId][version]) {
    registry.versions[contractId][version] = {
      ...versionInfo,
      deployments: {},
    };
  }
  registry.versions[contractId][version].deployments[network] = deployment;

  // Update network deployment
  if (!registry.networks[network]) {
    throw new Error(`Network '${network}' not configured`);
  }
  if (!registry.networks[network].deployments[contractId]) {
    registry.networks[network].deployments[contractId] = {
      proxy: "",
      currentVersion: "",
      currentImpl: "",
    };
  }
  registry.networks[network].deployments[contractId].currentVersion = version;
  registry.networks[network].deployments[contractId].currentImpl = deployment.impl;

  writeRegistry(registry);
}

/**
 * Update gitCommit for a specific version deployment
 */
export function updateVersionGitCommit(
  contractId: string,
  network: SupportedNetwork,
  version: string,
  gitCommit: string,
): void {
  const registry = readRegistry();

  if (!registry.versions[contractId]?.[version]?.deployments?.[network]) {
    throw new Error(`Deployment not found: ${contractId} v${version} on ${network}`);
  }

  registry.versions[contractId][version].deployments[network].gitCommit = gitCommit;
  writeRegistry(registry);
}

/**
 * Update proxy address for a contract on a network
 */
export function setProxyAddress(contractId: string, network: SupportedNetwork, proxyAddress: string): void {
  const registry = readRegistry();

  if (!registry.networks[network]) {
    throw new Error(`Network '${network}' not configured`);
  }
  if (!registry.networks[network].deployments[contractId]) {
    registry.networks[network].deployments[contractId] = {
      proxy: "",
      currentVersion: "",
      currentImpl: "",
    };
  }
  registry.networks[network].deployments[contractId].proxy = proxyAddress;

  writeRegistry(registry);
}

/**
 * Get current git commit hash
 */
export function getGitCommit(): string {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get short git commit hash
 */
export function getGitCommitShort(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

/**
 * Get current git branch
 */
export function getGitBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

/**
 * Check if there are uncommitted changes
 */
export function hasUncommittedChanges(): boolean {
  try {
    const status = execSync("git status --porcelain").toString().trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

/**
 * Create a git tag
 */
export function createGitTag(tag: string, message: string): void {
  execSync(`git tag -a ${tag} -m "${message}"`);
}

/**
 * Parse semantic version
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  };
}

/**
 * Compare versions (returns 1 if a > b, -1 if a < b, 0 if equal)
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major > vb.major ? 1 : -1;
  if (va.minor !== vb.minor) return va.minor > vb.minor ? 1 : -1;
  if (va.patch !== vb.patch) return va.patch > vb.patch ? 1 : -1;
  return 0;
}

/**
 * Increment version
 */
export function incrementVersion(version: string, type: "major" | "minor" | "patch"): string {
  const v = parseVersion(version);
  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

/**
 * Suggest next version based on current version
 */
export function suggestNextVersion(currentVersion: string): {
  patch: string;
  minor: string;
  major: string;
} {
  const v = parseVersion(currentVersion);
  return {
    patch: `${v.major}.${v.minor}.${v.patch + 1}`,
    minor: `${v.major}.${v.minor + 1}.0`,
    major: `${v.major + 1}.0.0`,
  };
}

/**
 * Validate that new version is a valid increment of current version
 */
export function validateVersionIncrement(
  currentVersion: string,
  newVersion: string,
): {
  valid: boolean;
  type: "patch" | "minor" | "major" | null;
  error?: string;
} {
  try {
    const current = parseVersion(currentVersion);
    const next = parseVersion(newVersion);

    // Check if it's a valid increment
    if (next.major === current.major + 1 && next.minor === 0 && next.patch === 0) {
      return { valid: true, type: "major" };
    }
    if (next.major === current.major && next.minor === current.minor + 1 && next.patch === 0) {
      return { valid: true, type: "minor" };
    }
    if (next.major === current.major && next.minor === current.minor && next.patch === current.patch + 1) {
      return { valid: true, type: "patch" };
    }

    // Not a valid increment
    const suggested = suggestNextVersion(currentVersion);
    return {
      valid: false,
      type: null,
      error: `Invalid version increment. Current: ${currentVersion}, Got: ${newVersion}. Valid options: ${suggested.patch} (patch), ${suggested.minor} (minor), ${suggested.major} (major)`,
    };
  } catch (e) {
    return { valid: false, type: null, error: `Invalid version format: ${e}` };
  }
}

/**
 * Read version from contract file's @custom:version
 */
export function readContractVersion(contractPath: string): string | null {
  try {
    const content = fs.readFileSync(contractPath, "utf-8");
    const match = content.match(/@custom:version\s+(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Read reinitializer version from contract's initialize function
 * Looks for patterns like: reinitializer(N) or initializer
 * Returns the highest reinitializer version found, or 1 if only initializer is found
 */
export function readReinitializerVersion(contractPath: string): number | null {
  try {
    const content = fs.readFileSync(contractPath, "utf-8");

    // Find all reinitializer(N) occurrences
    const reinitMatches = content.matchAll(/reinitializer\s*\(\s*(\d+)\s*\)/g);
    const versions: number[] = [];

    for (const match of reinitMatches) {
      versions.push(parseInt(match[1]));
    }

    if (versions.length > 0) {
      // Return the highest version found
      return Math.max(...versions);
    }

    // Check for basic initializer modifier (equivalent to reinitializer(1))
    if (content.match(/\binitializer\b/) && !content.match(/reinitializer/)) {
      return 1;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate that reinitializer version matches expected version
 * Expected version = previous initializer version + 1
 */
export function validateReinitializerVersion(
  contractPath: string,
  expectedVersion: number,
): { valid: boolean; actual: number | null; error?: string } {
  const actual = readReinitializerVersion(contractPath);

  if (actual === null) {
    return {
      valid: false,
      actual: null,
      error: "Could not find reinitializer/initializer modifier in contract",
    };
  }

  if (actual !== expectedVersion) {
    return {
      valid: false,
      actual,
      error: `Reinitializer version mismatch. Expected: reinitializer(${expectedVersion}), Found: reinitializer(${actual})`,
    };
  }

  return { valid: true, actual };
}

/**
 * Update version in contract file's @custom:version
 */
export function updateContractVersion(contractPath: string, newVersion: string): boolean {
  try {
    let content = fs.readFileSync(contractPath, "utf-8");
    const originalContent = content;

    // Update @custom:version
    content = content.replace(/@custom:version\s+\d+\.\d+\.\d+/, `@custom:version ${newVersion}`);

    // Also update version() function if it exists
    content = content.replace(/function version\(\)[^}]+return\s+"(\d+\.\d+\.\d+)"/, (match) =>
      match.replace(/"\d+\.\d+\.\d+"/, `"${newVersion}"`),
    );

    if (content !== originalContent) {
      fs.writeFileSync(contractPath, content);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get contract file path from contract ID
 */
export function getContractFilePath(contractId: string): string | null {
  const contract = getContractDefinition(contractId);
  const contractName = contract.source;

  // Common paths to check
  const possiblePaths = [
    path.join(__dirname, `../../contracts/${contractName}.sol`),
    path.join(__dirname, `../../contracts/tests/${contractName}.sol`),
    path.join(__dirname, `../../contracts/registry/${contractName}.sol`),
    path.join(__dirname, `../../contracts/utils/${contractName}.sol`),
    path.join(__dirname, `../../contracts/sdk/${contractName}.sol`),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Create a git commit
 */
export function gitCommit(message: string): boolean {
  try {
    execSync(`git add -A && git commit -m "${message}"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Format address for display (shortened)
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get Safe API URL for a network
 */
export function getSafeApiUrl(network: SupportedNetwork): string {
  // Safe Transaction Service API URLs (must end with /api/)
  const urls: Record<SupportedNetwork, string> = {
    celo: "https://safe-transaction-celo.safe.global/api/",
    "celo-sepolia": "https://safe-transaction-celo.safe.global/api/", // Celo testnet uses same as mainnet
    sepolia: "https://safe-transaction-sepolia.safe.global/api/",
    localhost: "", // No Safe service for localhost
  };
  return urls[network];
}

/**
 * Get block explorer URL for a network
 */
export function getExplorerUrl(network: SupportedNetwork): string {
  const urls: Record<SupportedNetwork, string> = {
    celo: "https://celoscan.io",
    "celo-sepolia": "https://celo-sepolia.blockscout.com",
    sepolia: "https://sepolia.etherscan.io",
    localhost: "http://localhost:8545", // No explorer for localhost
  };
  return urls[network];
}

/**
 * Get all contract IDs from registry
 */
export function getContractIds(): string[] {
  const registry = readRegistry();
  return Object.keys(registry.contracts);
}

/**
 * Check if contract is deployed on network
 */
export function isDeployedOnNetwork(contractId: string, network: SupportedNetwork): boolean {
  const deployment = getNetworkDeployment(contractId, network);
  if (!deployment) return false;

  const contract = getContractDefinition(contractId);
  if (contract.type === "uups-proxy") {
    return !!deployment.proxy;
  }
  return !!deployment.address;
}
