import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

function getTestRegistryInitializeData() {
  const registryArtifact = artifacts.readArtifactSync("testUpgradedIdentityRegistryImplV1");
  return new ethers.Interface(registryArtifact.abi);
}

export default buildModule("DeployNewHubAndUpgrade", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const registryProxyAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
  if (!registryProxyAddress) {
    throw new Error("Registry proxy address not found in deployed_addresses.json");
  }

  const newRegistryImpl = m.contract("testUpgradedIdentityVerificationHubImplV1");

  const testRegistryInterface = getTestRegistryInitializeData();
  const initializeData = testRegistryInterface.encodeFunctionData("initialize", [true]);

  const registryProxy = m.contractAt("IdentityRegistryImplV1", registryProxyAddress);

  m.call(registryProxy, "upgradeToAndCall", [newRegistryImpl, initializeData]);

  return {
    newRegistryImpl,
    registryProxy,
  };
});
