import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

export default buildModule("UpgradeKycRegistryModule", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const kycProxyAddress = deployedAddresses["DeployKycRegistryModule#IdentityRegistry"];
  if (!kycProxyAddress) {
    throw new Error("KYC Registry proxy address not found in deployed_addresses.json");
  }

  const poseidonT3 = m.library("PoseidonT3");

  const newKycImpl = m.contract("IdentityRegistryKycImplV1", [], {
    libraries: { PoseidonT3: poseidonT3 },
  });

  const kycProxy = m.contractAt("IdentityRegistryKycImplV1", kycProxyAddress, {
    id: "KycRegistryProxy",
  });

  m.call(kycProxy, "upgradeToAndCall", [newKycImpl, "0x"], {
    after: [newKycImpl],
  });

  return {
    poseidonT3,
    newKycImpl,
    kycProxy,
  };
});
