import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { getSavedRepo, getDeployedAddresses, getContractAddress, log } from "../../../scripts/constants";

module.exports = buildModule("UpdateRegistryHubV2", (m) => {
  const chainId = hre.network.config.chainId;
  const networkName = hre.network.name;

  log.info(`Network: ${networkName}, Chain ID: ${chainId}`);

  const repoName = getSavedRepo(networkName);
  const deployedAddresses = getDeployedAddresses(repoName);

  log.info(`Using repo: ${repoName}`);

  try {
    const registryAddress = getContractAddress("DeployRegistryModule#IdentityRegistry", deployedAddresses);
    const registryIdCardAddress = getContractAddress("DeployIdCardRegistryModule#IdentityRegistry", deployedAddresses);
    const hubAddress = getContractAddress("DeployHubV2#IdentityVerificationHub", deployedAddresses);

    log.info(`Registry address: ${registryAddress}`);
    log.info(`Registry ID Card address: ${registryIdCardAddress}`);
    log.info(`Hub address: ${hubAddress}`);

    const deployedRegistryInstance = m.contractAt("IdentityRegistryImplV1", registryAddress);
    const deployedRegistryIdCardInstance = m.contractAt("IdentityRegistryIdCardImplV1", registryIdCardAddress);

    log.success("Created registry contract instances");

    // Execute the updateHub calls
    log.step("Updating hub address on IdentityRegistry...");
    m.call(deployedRegistryInstance, "updateHub", [hubAddress]);

    log.step("Updating hub address on IdentityRegistryIdCard...");
    m.call(deployedRegistryIdCardInstance, "updateHub", [hubAddress]);

    log.success("Hub update calls initiated successfully");

    return {
      deployedRegistryInstance,
      deployedRegistryIdCardInstance,
    };
  } catch (error) {
    log.error(`Failed to update registry hub: ${error}`);
    throw error;
  }
});
