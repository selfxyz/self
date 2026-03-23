import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

export default buildModule("UpgradeRegistryModule", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const registryProxyAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];
  if (!registryProxyAddress) {
    throw new Error("Passport Registry proxy address not found in deployed_addresses.json");
  }

  // Deploy PoseidonT3 library (required by Passport registry)
  const poseidonT3 = m.library("PoseidonT3");

  // Deploy new Passport implementation with PoseidonT3 linked
  const newRegistryImpl = m.contract("IdentityRegistryImplV1", [], {
    libraries: { PoseidonT3: poseidonT3 },
  });

  // Get proxy reference
  const registryProxy = m.contractAt("IdentityRegistryImplV1", registryProxyAddress, {
    id: "RegistryProxy",
  });

  // Code-only upgrade — no new reinitializer needed
  m.call(registryProxy, "upgradeToAndCall", [newRegistryImpl, "0x"], {
    after: [newRegistryImpl],
  });

  return {
    poseidonT3,
    newRegistryImpl,
    registryProxy,
  };
});
