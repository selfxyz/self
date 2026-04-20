import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

export default buildModule("UpgradeAadhaarRegistryModule", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const aadhaarProxyAddress = deployedAddresses["DeployAadhaarRegistryModule#IdentityRegistry"];
  if (!aadhaarProxyAddress) {
    throw new Error("Aadhaar Registry proxy address not found in deployed_addresses.json");
  }

  // Deploy PoseidonT3 library (required by Aadhaar registry)
  const poseidonT3 = m.library("PoseidonT3");

  // Deploy new Aadhaar implementation with PoseidonT3 linked
  const newAadhaarImpl = m.contract("IdentityRegistryAadhaarImplV1", [], {
    libraries: { PoseidonT3: poseidonT3 },
  });

  const aadhaarProxy = m.contractAt("IdentityRegistryAadhaarImplV1", aadhaarProxyAddress, {
    id: "AadhaarRegistryProxy",
  });
  m.call(aadhaarProxy, "upgradeToAndCall", [newAadhaarImpl, "0x"], {
    after: [newAadhaarImpl],
  });

  return {
    poseidonT3,
    newAadhaarImpl,
  };
});
