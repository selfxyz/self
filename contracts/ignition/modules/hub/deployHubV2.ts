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
 * 1. All required libraries (7 total):
 *    - CustomVerifier
 *    - OutputFormatterLib
 *    - ProofVerifierLib
 *    - RegisterProofVerifierLib
 *    - DscProofVerifierLib
 *    - RootCheckLib
 *    - OfacCheckLib
 * 2. IdentityVerificationHubImplV2 - The implementation contract with library linkage
 * 3. IdentityVerificationHub - The proxy contract pointing to the implementation
 *
 * Usage:
 * - Deploy: `npx hardhat ignition deploy ignition/modules/hub/deployHubV2.ts --network <network-name>`
 * - Deploy and verify: `npx hardhat ignition deploy ignition/modules/hub/deployHubV2.ts --network <network-name> --verify`
 * - The proxy will be initialized with the V2 implementation
 * - Circuit version is automatically set to 2 during initialization
 * - After deployment, use the update functions to configure:
 *   - Registry addresses via updateRegistry()
 *   - Circuit verifiers via updateVcAndDiscloseCircuit(), updateRegisterCircuitVerifier(), updateDscVerifier()
 *   - Verification configs via setVerificationConfigV2()
 *
 * Post-deployment configuration steps:
 * 1. Set registry addresses for each attestation type (E_PASSPORT, EU_ID_CARD, AADHAAR, SELFRICA_ID_CARD)
 * 2. Configure circuit verifiers for different signature types
 * 3. Set up verification configurations using setVerificationConfigV2()
 * 4. Transfer ownership to the appropriate address if needed
 *
 * Troubleshooting Verification Issues:
 * If contracts are not verified during deployment (common with API issues):
 *
 * 1. Manual verification for libraries (one command per library):
 *    `npx hardhat verify --network <network-name> <LIBRARY_ADDRESS>`
 *
 * 2. Manual verification for IdentityVerificationHubImplV2 (requires library linkage):
 *    Create a libraries file (e.g., verify-libs.js):
 *    ```
 *    module.exports = {
 *      "contracts/libraries/CustomVerifier.sol:CustomVerifier": "<CUSTOM_VERIFIER_ADDRESS>",
 *      "contracts/libraries/OutputFormatterLib.sol:OutputFormatterLib": "<OUTPUT_FORMATTER_ADDRESS>",
 *      "contracts/libraries/ProofVerifierLib.sol:ProofVerifierLib": "<PROOF_VERIFIER_ADDRESS>",
 *      "contracts/libraries/RegisterProofVerifierLib.sol:RegisterProofVerifierLib": "<REGISTER_PROOF_VERIFIER_ADDRESS>",
 *      "contracts/libraries/DscProofVerifierLib.sol:DscProofVerifierLib": "<DSC_PROOF_VERIFIER_ADDRESS>",
 *      "contracts/libraries/RootCheckLib.sol:RootCheckLib": "<ROOT_CHECK_ADDRESS>",
 *      "contracts/libraries/OfacCheckLib.sol:OfacCheckLib": "<OFAC_CHECK_ADDRESS>"
 *    };
 *    ```
 *    Then verify: `npx hardhat verify --network <network-name> --libraries verify-libs.js <IMPL_V2_ADDRESS>`
 *
 * 3. Manual verification for proxy contract:
 *    `npx hardhat verify --network <network-name> <PROXY_ADDRESS> <IMPL_V2_ADDRESS> <INIT_DATA>`
 *
 * 4. Alternative verification command:
 *    `npx hardhat ignition verify chain-<chainId> --include-unrelated-contracts`
 *
 * Common verification failure reasons:
 * - API rate limits or temporary service issues
 * - Library linkage not properly detected
 * - Etherscan API v1/v2 configuration issues
 *
 * Note: Verification failures do NOT affect contract functionality - contracts work normally even if unverified.
 * Verification only affects source code display on block explorers.
 */
export default buildModule("DeployHubV2", (m) => {
  // Deploy all required libraries
  const customVerifier = m.library("CustomVerifier");
  const outputFormatterLib = m.library("OutputFormatterLib");
  const proofVerifierLib = m.library("ProofVerifierLib");
  const registerProofVerifierLib = m.library("RegisterProofVerifierLib");
  const dscProofVerifierLib = m.library("DscProofVerifierLib");
  const rootCheckLib = m.library("RootCheckLib");
  const ofacCheckLib = m.library("OfacCheckLib");

  // Deploy the implementation contract with all library linkages
  const identityVerificationHubImplV2 = m.contract("IdentityVerificationHubImplV2", [], {
    libraries: {
      CustomVerifier: customVerifier,
      OutputFormatterLib: outputFormatterLib,
      ProofVerifierLib: proofVerifierLib,
      RegisterProofVerifierLib: registerProofVerifierLib,
      DscProofVerifierLib: dscProofVerifierLib,
      RootCheckLib: rootCheckLib,
      OfacCheckLib: ofacCheckLib,
    },
  });

  // Get the interface to encode the initialize function call
  const hubInterface = getHubImplV2InitializeData();

  // The V2 initialize function takes no parameters (unlike V1)
  // It automatically sets circuit version to 2 and emits HubInitializedV2 event
  const initializeData = hubInterface.encodeFunctionData("initialize", []);

  // Deploy the proxy contract with the implementation address and initialization data
  const hub = m.contract("IdentityVerificationHub", [identityVerificationHubImplV2, initializeData]);

  return {
    // Libraries
    customVerifier,
    outputFormatterLib,
    proofVerifierLib,
    registerProofVerifierLib,
    dscProofVerifierLib,
    rootCheckLib,
    ofacCheckLib,
    // Contracts
    hub,
    identityVerificationHubImplV2,
  };
});
