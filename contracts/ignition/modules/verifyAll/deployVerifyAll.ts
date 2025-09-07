import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

export default buildModule("DeployVerifyAll", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));
  const hubAddress = deployedAddresses["DeployHub#IdentityVerificationHub"];
  const registryAddress = deployedAddresses["DeployRegistryModule#IdentityRegistry"];

  const verifyAll = m.contract("VerifyAll", [hubAddress, registryAddress]);
  return {
    verifyAll,
  };
});
