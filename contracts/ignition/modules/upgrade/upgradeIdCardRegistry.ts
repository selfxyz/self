import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

export default buildModule("UpgradeIdCardRegistryModule", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const idCardProxyAddress = deployedAddresses["DeployIdCardRegistryModule#IdentityRegistry"];
  if (!idCardProxyAddress) {
    throw new Error("IdCard Registry proxy address not found in deployed_addresses.json");
  }

  // Deploy PoseidonT3 library (required by IdCard registry)
  const poseidonT3 = m.library("PoseidonT3");

  // Deploy new IdCard implementation with PoseidonT3 linked
  const newIdCardImpl = m.contract("IdentityRegistryIdCardImplV1", [], {
    libraries: { PoseidonT3: poseidonT3 },
  });

  const idCardProxy = m.contractAt("IdentityRegistryIdCardImplV1", idCardProxyAddress, {
    id: "IdCardRegistryProxy",
  });
  m.call(idCardProxy, "upgradeToAndCall", [newIdCardImpl, "0x"], {
    after: [newIdCardImpl],
  });

  return {
    poseidonT3,
    newIdCardImpl,
  };
});
