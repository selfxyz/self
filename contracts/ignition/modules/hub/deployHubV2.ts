import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { artifacts, ethers } from "hardhat";
import hre from "hardhat";

/**
 * Creates the interface for the IdentityVerificationHubImplV2 contract
 * Used to encode the initialize function call data for the proxy deployment
 * @returns ethers.Interface instance for the hub implementation contract
 */
function getHubImplV2InitializeData() {
  const hubArtifact = artifacts.readArtifactSync("IdentityVerificationHubImplV2");
  return new ethers.Interface(hubArtifact.abi);
}

/**
 * Hardhat Ignition deployment module for Identity Verification Hub V2
 *
 * This module deploys:
 * 1. CustomVerifier - The library required by the implementation contract
 * 2. IdentityVerificationHubImplV2 - The implementation contract
 * 3. IdentityVerificationHub - The proxy contract pointing to the implementation
 *
 * Usage:
 * - Deploy: `npx hardhat ignition deploy ignition/modules/deployV2.ts --network <network-name>`
 * - Deploy and verify: `npx hardhat ignition deploy ignition/modules/deployV2.ts --network <network-name> --verify`
 * - The proxy will be initialized with the V2 implementation
 * - Circuit version is automatically set to 2 during initialization
 * - After deployment, use the update functions to configure:
 *   - Registry addresses via updateRegistry()
 *   - Circuit verifiers via updateVcAndDiscloseCircuit(), updateRegisterCircuitVerifier(), updateDscVerifier()
 *   - Verification configs via setVerificationConfigV2()
 *
 * Post-deployment configuration steps:
 * 1. Set registry addresses for each attestation type (E_PASSPORT, EU_ID_CARD)
 * 2. Configure circuit verifiers for different signature types
 * 3. Set up verification configurations using setVerificationConfigV2()
 * 4. Transfer ownership to the appropriate address if needed
 */
export default buildModule("DeployV2", (m) => {
  // Deploy the CustomVerifier library
  const customVerifier = m.library("CustomVerifier");

  // Deploy the implementation contract with library linkage
  const identityVerificationHubImplV2 = m.contract("IdentityVerificationHubImplV2", [], {
    libraries: { CustomVerifier: customVerifier },
  });

  // Get the interface to encode the initialize function call
  const hubInterface = getHubImplV2InitializeData();

  // The V2 initialize function takes no parameters (unlike V1)
  // It automatically sets circuit version to 2 and emits HubInitializedV2 event
  const initializeData = hubInterface.encodeFunctionData("initialize", []);

  // Deploy the proxy contract with the implementation address and initialization data
  const hub = m.contract("IdentityVerificationHub", [identityVerificationHubImplV2, initializeData]);

  return {
    customVerifier,
    hub,
    identityVerificationHubImplV2,
  };
});
