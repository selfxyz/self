import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";

function getHubImplV2InitializeData() {
  const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV2");
  return new ethers.Interface(hubArtifact.abi);
}

export default buildModule("DeployNewHubAndUpgradee", (m) => {
  const networkName = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${networkName}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  const hubProxyAddress = deployedAddresses["DeployHubV2#IdentityVerificationHub"];
  if (!hubProxyAddress) {
    throw new Error("Hub proxy address not found in deployed_addresses.json");
  }

  const customVerifier = m.library("CustomVerifier");
  const identityVerificationHubImplV2 = m.contract("IdentityVerificationHubImplV2", [], {
    libraries: { CustomVerifier: customVerifier },
  });

  // Get the interface to encode the initialize function call
  const hubInterface = getHubImplV2InitializeData();

  // The V2 initialize function takes no parameters (unlike V1)
  // It automatically sets circuit version to 2 and emits HubInitializedV2 event
  const initializeData = hubInterface.encodeFunctionData("initialize", []);

  const hubProxy = m.contractAt("IdentityVerificationHubImplV2", hubProxyAddress, { id: "IdentityVerificationHubV2" });

  const a = m.call(hubProxy, "upgradeToAndCall", [identityVerificationHubImplV2, initializeData], {
    after: [identityVerificationHubImplV2],
  });

  m.call(hubProxy, "setAadhaarRegistrationWindow", [120], { after: [a] });

  return {
    identityVerificationHubImplV2,
    hubProxy,
  };
});
