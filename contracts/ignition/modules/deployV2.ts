import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";

function getHubImplV2InitializeData() {
  const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV2");
  return new ethers.Interface(hubArtifact.abi);
}

export default buildModule("DeployV2", (m) => {
  const identityVerificationHubImplV2 = m.contract("IdentityVerificationHubImplV2");

  const hubInterface = getHubImplV2InitializeData();

  // Initialize with empty values as per instructions
  const initializeData = hubInterface.encodeFunctionData("initialize", [
    [], // attestationIds
    [], // registryAddresses
    [], // vcAndDiscloseCircuitVerifierAddresses
    [], // registerCircuitVerifierIds
    [], // registerCircuitVerifierAddresses
    [], // dscCircuitVerifierIds
    [], // dscCircuitVerifierAddresses
  ]);

  const hub = m.contract("IdentityVerificationHub", [identityVerificationHubImplV2, initializeData]);

  return {
    hub,
    identityVerificationHubImplV2,
  };
});
