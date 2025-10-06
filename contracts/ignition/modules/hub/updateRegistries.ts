import { buildModule, IgnitionModuleBuilder } from "@nomicfoundation/ignition-core";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

// Attestation IDs from the contract (matching AttestationId.sol)
const AttestationId = {
  E_PASSPORT: "0x0000000000000000000000000000000000000000000000000000000000000001",
  EU_ID_CARD: "0x0000000000000000000000000000000000000000000000000000000000000002",
  AADHAAR: "0x0000000000000000000000000000000000000000000000000000000000000003",
};

// Map registry deployment modules to their attestation IDs
const registryToAttestationId: Record<string, string> = {
  // "DeployRegistryModule#IdentityRegistry": AttestationId.E_PASSPORT,
  // "DeployIdCardRegistryModule#IdentityRegistry": AttestationId.EU_ID_CARD,
  "DeployAadhaarRegistryModule#IdentityRegistry": AttestationId.AADHAAR,
};

const ids = (() => {
  let id = 0;
  return () => {
    id++;
    return "a" + id.toString();
  };
})();

export function updateHubRegistries(m: IgnitionModuleBuilder, hubAddress: string, deployedAddresses: any) {
  const hubContract = m.contractAt("IdentityVerificationHubImplV2", hubAddress);

  console.log("Updating hub registries...");
  console.log("Hub address:", hubAddress);

  // Update registries based on what's deployed
  for (const [registryModule, attestationId] of Object.entries(registryToAttestationId)) {
    const registryAddress = deployedAddresses[registryModule];

    if (registryAddress) {
      console.log(`Updating ${registryModule} -> ${registryAddress} (AttestationId: ${attestationId})`);
      m.call(hubContract, "updateRegistry", [attestationId, registryAddress], { id: ids() });
    } else {
      console.log(`Registry ${registryModule} not found in deployed addresses, skipping`);
    }
  }

  return hubContract;
}

export default buildModule("UpdateHubRegistries", (m) => {
  const chainId = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${chainId}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  // Get the hub address
  const hubAddress = deployedAddresses["DeployHubV2#IdentityVerificationHub"];

  if (!hubAddress) {
    throw new Error("Hub address not found in deployed addresses");
  }

  const hubContract = updateHubRegistries(m, hubAddress, deployedAddresses);

  return {
    hubContract,
  };
});
