/**
 * Types for upgrade tooling
 */

export const SUPPORTED_NETWORKS = ["celo", "celo-sepolia", "sepolia", "localhost"] as const;
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

// Contract IDs match registry keys
export const CONTRACT_IDS = [
  "IdentityVerificationHub",
  "IdentityRegistry",
  "IdentityRegistryIdCard",
  "IdentityRegistryAadhaar",
  "PCR0Manager",
  "VerifyAll",
  "DummyContract",
] as const;
export type ContractId = (typeof CONTRACT_IDS)[number];

// Re-export types from utils for convenience
export type {
  ContractDefinition,
  NetworkConfig,
  NetworkDeployment,
  GovernanceConfig,
  VersionInfo,
  VersionDeployment,
  DeploymentRegistry,
} from "./utils";
