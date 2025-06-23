import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import fs from "fs";
import path from "path";

module.exports = buildModule("UpdateRegistryHubV2", (m) => {
  const repo = hre.network.config.chainId === 42220 ? "prod" : "staging";
  const deployedAddressesPath = path.join(__dirname, `../../deployments/${repo}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, "utf8"));

  const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
  const registryIdCardAddress = deployedAddresses["DeployIdCardRegistryModule#IdentityRegistryIdCard"];
  const hubAddress = deployedAddresses["DeployV2#IdentityVerificationHub"];

  const deployedRegistryInstance = m.contractAt("IdentityRegistryImplV1", registryAddress);
  const deployedRegistryIdCardInstance = m.contractAt("IdentityRegistryIdCardImplV1", registryIdCardAddress);
  console.log("Deployed registry instance", deployedRegistryInstance);
  console.log("Deployed registry id card instance", deployedRegistryIdCardInstance);
  m.call(deployedRegistryInstance, "updateHub", [hubAddress]);
  m.call(deployedRegistryIdCardInstance, "updateHub", [hubAddress]);
  return { deployedRegistryInstance };
});
