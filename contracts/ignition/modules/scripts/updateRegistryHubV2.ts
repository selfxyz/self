import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import fs from "fs";
import path from "path";

module.exports = buildModule("UpdateRegistryHubV2", (m) => {
  const repo = hre.network.config.chainId === 42220 ? "prod" : "staging";
  const deployedAddressesPath = path.join(__dirname, `../../deployments/${repo}/deployed_addresses.json`);

  console.log(`Reading deployed addresses from: ${deployedAddressesPath}`);
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

  const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
  const registryIdCardAddress = deployedAddresses["DeployIdCardRegistryModule#IdentityRegistryIdCard"];
  const hubAddress = deployedAddresses["DeployHubV2#IdentityVerificationHub"];

  // Validate addresses
  if (!registryAddress) {
    throw new Error("IdentityRegistry address not found in deployed addresses");
  }
  if (!registryIdCardAddress) {
    throw new Error("IdentityRegistryIdCard address not found in deployed addresses");
  }
  if (!hubAddress) {
    throw new Error("IdentityVerificationHub address not found in deployed addresses");
  }

  console.log(`Registry address: ${registryAddress}`);
  console.log(`Registry ID Card address: ${registryIdCardAddress}`);
  console.log(`Hub address: ${hubAddress}`);

  const deployedRegistryInstance = m.contractAt("IdentityRegistryImplV1", registryAddress);
  const deployedRegistryIdCardInstance = m.contractAt("IdentityRegistryIdCardImplV1", registryIdCardAddress);

  console.log("✓ Created registry contract instances");

    // Execute the updateHub calls
  console.log("Updating hub address on IdentityRegistry...");
  m.call(deployedRegistryInstance, "updateHub", [hubAddress]);

  console.log("Updating hub address on IdentityRegistryIdCard...");
  m.call(deployedRegistryIdCardInstance, "updateHub", [hubAddress]);

  console.log("✓ Hub update calls initiated successfully");

    return {
    deployedRegistryInstance,
    deployedRegistryIdCardInstance
  };
});
