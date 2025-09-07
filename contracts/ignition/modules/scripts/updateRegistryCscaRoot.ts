import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";
import { getCscaTreeRoot } from "@selfxyz/common/utils/trees";
import serialized_csca_tree from "../../../../common/pubkeys/serialized_csca_tree.json";

module.exports = buildModule("UpdateRegistryCscaRoot", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];

  const deployedRegistryInstance = m.contractAt("IdentityRegistryImplV1", registryAddress);
  console.log("Deployed registry instance", deployedRegistryInstance);
  const merkleRoot = getCscaTreeRoot(serialized_csca_tree);
  console.log("Merkle root", merkleRoot);
  m.call(deployedRegistryInstance, "updateCscaRoot", [merkleRoot]);
  return { deployedRegistryInstance };
});
