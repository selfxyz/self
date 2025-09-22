import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";
import path from "path";

function getHubInitializeData() {
  const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV1");
  return new ethers.Interface(hubArtifact.abi);
}

/**
 * Deploy Identity Verification Hub V1
 * This module deploys the V1 implementation of the Identity Verification Hub
 */
export default buildModule("DeployHubV1", (m) => {
  // Deploy V1 implementation
  const identityVerificationHubImplV1 = m.contract("IdentityVerificationHubImplV1");

  const hubInterface = getHubInitializeData();
  const initializeData = hubInterface.encodeFunctionData("initialize", ["", "", [], [], [], []]);

  // Deploy proxy with V1 implementation
  const hubV1 = m.contract("IdentityVerificationHub", [identityVerificationHubImplV1, initializeData]);

  return {
    hubV1,
    identityVerificationHubImplV1,
  };
});
