import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { RegisterVerifierId, DscVerifierId } from "@selfxyz/common";
import {
  getContractAbi,
  getDeployedAddresses,
  getSavedRepo,
  getContractAddress,
  ATTESTATION_ID,
  log,
} from "./constants";

dotenv.config();

// Configuration for which verifiers to set
const setVerifiers = {
  vcAndDisclose: true, // VC and Disclose verifier for E_PASSPORT
  vcAndDiscloseId: true, // VC and Disclose ID verifier for EU_ID_CARD
  register: true, // Register verifiers for E_PASSPORT
  registerId: true, // Register ID verifiers for EU_ID_CARD
  dsc: false, // DSC verifiers for both E_PASSPORT and EU_ID_CARD
};

const NETWORK = process.env.NETWORK;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!NETWORK) {
  throw new Error("One of the following parameter is null: NETWORK, RPC_URL, PRIVATE_KEY");
}

const repoName = getSavedRepo(NETWORK);
const deployedAddresses = getDeployedAddresses(repoName);

log.info(`Network: ${NETWORK}, Repo: ${repoName}`);

try {
  const hubABI = getContractAbi(repoName, "DeployHubV2#IdentityVerificationHubImplV2");
  const prefix = "DeployAllVerifiers";

  function getContractAddressByPartialName(partialName: string): string | undefined {
    const fullKey = `${prefix}#${partialName}`;
    console.log(`🔍 Searching for contract with exact key: "${fullKey}"`);

    if (deployedAddresses[fullKey]) {
      console.log(`   ✅ Found exact match: ${fullKey} -> ${deployedAddresses[fullKey]}`);
      return deployedAddresses[fullKey] as string;
    }

    console.log(`   ❌ No exact match found for: "${fullKey}"`);
    return undefined;
  }

  async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL as string);
    const wallet = new ethers.Wallet(PRIVATE_KEY as string, provider);
    console.log(`Wallet address: ${wallet.address}`);
    const hubAddress = getContractAddress("DeployHubV2#IdentityVerificationHub", deployedAddresses);

    if (!hubAddress) {
      throw new Error("❌ Hub address not found in deployed_addresses.json");
    }
    const identityVerificationHub = new ethers.Contract(hubAddress, hubABI, wallet);
    console.log(`   Hub contract address: ${hubAddress}`);

    let totalUpdates = 0;
    let successfulUpdates = 0;

    // Update VC and Disclose verifier for E_PASSPORT
    if (setVerifiers.vcAndDisclose) {
      log.step("Updating VC and Disclose verifier for E_PASSPORT");

      try {
        const verifierAddress = getContractAddress("DeployAllVerifiers#Verifier_vc_and_disclose", deployedAddresses);
        const attestationId = ATTESTATION_ID.E_PASSPORT;

        totalUpdates++;
        const tx = await identityVerificationHub.updateVcAndDiscloseCircuit(attestationId, verifierAddress);
        const receipt = await tx.wait();

        log.success(`VC verifier for E_PASSPORT updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update VC verifier for E_PASSPORT: ${error}`);
      }
    }

    // Update VC and Disclose ID verifier for EU_ID_CARD
    if (setVerifiers.vcAndDiscloseId) {
      log.step("Updating VC and Disclose ID verifier for EU_ID_CARD");

      try {
        const verifierAddress = getContractAddress("DeployAllVerifiers#Verifier_vc_and_disclose_id", deployedAddresses);
        const attestationId = ATTESTATION_ID.EU_ID_CARD;

        totalUpdates++;
        const tx = await identityVerificationHub.updateVcAndDiscloseCircuit(attestationId, verifierAddress);
        const receipt = await tx.wait();

        log.success(`VC ID verifier for EU_ID_CARD updated (tx: ${receipt.hash})`);
        successfulUpdates++;
      } catch (error) {
        log.error(`Failed to update VC ID verifier for EU_ID_CARD: ${error}`);
      }
    }

    // Batch update register circuit verifiers for E_PASSPORT
    if (setVerifiers.register) {
      log.step("Updating register circuit verifiers for E_PASSPORT");

      const registerVerifierKeys = Object.keys(RegisterVerifierId).filter((key) => isNaN(Number(key)));
      const regularRegisterKeys = registerVerifierKeys.filter((key) => !key.startsWith("register_id_"));

      const registerAttestationIds: string[] = [];
      const registerCircuitVerifierIds: number[] = [];
      const registerCircuitVerifierAddresses: string[] = [];

      for (const key of regularRegisterKeys) {
        const verifierName = `Verifier_${key}`;
        const verifierAddress = getContractAddressByPartialName(verifierName);

        if (!verifierAddress) {
          log.warning(`Skipping ${verifierName} - not found`);
          continue;
        }

        const verifierId = RegisterVerifierId[key as keyof typeof RegisterVerifierId];
        registerAttestationIds.push(ATTESTATION_ID.E_PASSPORT);
        registerCircuitVerifierIds.push(verifierId);
        registerCircuitVerifierAddresses.push(verifierAddress);
      }

      if (registerCircuitVerifierIds.length > 0) {
        try {
          totalUpdates++;
          const tx = await identityVerificationHub.batchUpdateRegisterCircuitVerifiers(
            registerAttestationIds,
            registerCircuitVerifierIds,
            registerCircuitVerifierAddresses,
          );
          const receipt = await tx.wait();
          log.success(
            `Register verifiers for E_PASSPORT updated: ${registerCircuitVerifierIds.length} verifiers (tx: ${receipt.hash})`,
          );
          successfulUpdates++;
        } catch (error) {
          log.error(`Failed to update register verifiers for E_PASSPORT: ${error}`);
        }
      } else {
        log.warning("No register circuit verifiers found for E_PASSPORT");
      }
    }

    // Batch update register circuit verifiers for EU_ID_CARD (using register_id verifiers)
    if (setVerifiers.registerId) {
      log.step("Updating register_id circuit verifiers for EU_ID_CARD");

      // Get all register_id verifiers from deployed addresses
      const registerIdVerifiers: string[] = [];
      for (const key of Object.keys(deployedAddresses)) {
        if (key.includes("Verifier_register_id_")) {
          const circuitName = key.replace("DeployAllVerifiers#Verifier_", "");
          registerIdVerifiers.push(circuitName);
        }
      }

      const registerIdAttestationIds: string[] = [];
      const registerIdCircuitVerifierIds: number[] = [];
      const registerIdCircuitVerifierAddresses: string[] = [];

      for (const registerIdCircuitName of registerIdVerifiers) {
        const verifierName = `DeployAllVerifiers#Verifier_${registerIdCircuitName}`;

        try {
          const verifierAddress = getContractAddress(verifierName, deployedAddresses);

          // Map circuit name to RegisterVerifierId
          if (registerIdCircuitName in RegisterVerifierId) {
            const verifierId = RegisterVerifierId[registerIdCircuitName as keyof typeof RegisterVerifierId];
            registerIdAttestationIds.push(ATTESTATION_ID.EU_ID_CARD);
            registerIdCircuitVerifierIds.push(verifierId as number);
            registerIdCircuitVerifierAddresses.push(verifierAddress);
          } else {
            log.warning(`No RegisterVerifierId mapping found for: ${registerIdCircuitName}`);
          }
        } catch (error) {
          log.warning(`Skipping ${verifierName} - not found`);
        }
      }

      if (registerIdCircuitVerifierIds.length > 0) {
        try {
          totalUpdates++;
          const tx = await identityVerificationHub.batchUpdateRegisterCircuitVerifiers(
            registerIdAttestationIds,
            registerIdCircuitVerifierIds,
            registerIdCircuitVerifierAddresses,
          );
          const receipt = await tx.wait();
          log.success(
            `Register_id verifiers for EU_ID_CARD updated: ${registerIdCircuitVerifierIds.length} verifiers (tx: ${receipt.hash})`,
          );
          successfulUpdates++;
        } catch (error) {
          log.error(`Failed to update register_id verifiers for EU_ID_CARD: ${error}`);
        }
      } else {
        log.warning("No register_id circuit verifiers found for EU_ID_CARD");
      }
    }

    // Batch update DSC circuit verifiers
    if (setVerifiers.dsc) {
      log.step("Updating DSC circuit verifiers");

      const dscKeys = Object.keys(DscVerifierId).filter((key) => isNaN(Number(key)));

      // Update for both E_PASSPORT and EU_ID_CARD
      const attestationTypes = ["E_PASSPORT", "EU_ID_CARD"] as const;

      for (const attestationType of attestationTypes) {
        const dscAttestationIds: string[] = [];
        const dscCircuitVerifierIds: number[] = [];
        const dscCircuitVerifierAddresses: string[] = [];

        for (const key of dscKeys) {
          const verifierName = `Verifier_${key}`;
          const verifierAddress = getContractAddressByPartialName(verifierName);

          if (!verifierAddress) {
            log.warning(`Skipping ${verifierName} - not found`);
            continue;
          }

          const verifierId = DscVerifierId[key as keyof typeof DscVerifierId];
          dscAttestationIds.push(ATTESTATION_ID[attestationType]);
          dscCircuitVerifierIds.push(verifierId);
          dscCircuitVerifierAddresses.push(verifierAddress);
        }

        if (dscCircuitVerifierIds.length > 0) {
          try {
            totalUpdates++;
            const tx = await identityVerificationHub.batchUpdateDscCircuitVerifiers(
              dscAttestationIds,
              dscCircuitVerifierIds,
              dscCircuitVerifierAddresses,
            );
            const receipt = await tx.wait();
            log.success(
              `DSC verifiers for ${attestationType} updated: ${dscCircuitVerifierIds.length} verifiers (tx: ${receipt.hash})`,
            );
            successfulUpdates++;
          } catch (error) {
            log.error(`Failed to update DSC verifiers for ${attestationType}: ${error}`);
          }
        } else {
          log.warning(`No DSC circuit verifiers found for ${attestationType}`);
        }
      }
    }

    log.info(`Verifier update summary: ${successfulUpdates}/${totalUpdates} successful`);
  }

  main().catch((error) => {
    log.error(`Execution failed: ${error}`);
    if (error.reason) log.error(`Reason: ${error.reason}`);
    process.exitCode = 1;
  });
} catch (error) {
  log.error(`Setup failed: ${error}`);
  process.exitCode = 1;
}
