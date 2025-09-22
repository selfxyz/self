import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

module.exports = buildModule("UpdateRegistryHub", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
  const hubAddress = deployedAddresses["DeployHub#IdentityVerificationHub"];

  const deployedRegistryInstance = m.contractAt("IdentityRegistryImplV1", registryAddress);
  console.log("Deployed registry instance", deployedRegistryInstance);
  m.call(deployedRegistryInstance, "updateHub", [hubAddress]);
  return { deployedRegistryInstance };
});
