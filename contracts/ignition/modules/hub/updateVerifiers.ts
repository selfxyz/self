import { buildModule, IgnitionModuleBuilder } from "@nomicfoundation/ignition-core";
import hre from "hardhat";
import { readFileSync } from "fs";
import path from "path";
import { circuitIds, CircuitName } from "../verifiers/deployAllVerifiers";

// Attestation IDs from the contract
const AttestationId = {
  E_PASSPORT: "0x0000000000000000000000000000000000000000000000000000000000000001",
  EU_ID_CARD: "0x0000000000000000000000000000000000000000000000000000000000000002",
  AADHAAR: "0x0000000000000000000000000000000000000000000000000000000000000003",
};

// Circuit type mappings based on circuit names
const getCircuitType = (
  circuitName: CircuitName,
): { attestationId: string; typeId: number; circuitType: "register" | "dsc" | "vc_and_disclose" } => {
  if (circuitName.startsWith("register_")) {
    const [shouldDeploy, typeId] = circuitIds[circuitName];
    if (circuitName.startsWith("register_id_")) {
      return { attestationId: AttestationId.EU_ID_CARD, typeId, circuitType: "register" };
    } else if (circuitName === "register_aadhaar") {
      return { attestationId: AttestationId.AADHAAR, typeId, circuitType: "register" };
    } else {
      return { attestationId: AttestationId.E_PASSPORT, typeId, circuitType: "register" };
    }
  } else if (circuitName.startsWith("dsc_")) {
    const [shouldDeploy, typeId] = circuitIds[circuitName];
    // DSC circuits are used for both passport and ID card
    return { attestationId: AttestationId.E_PASSPORT, typeId, circuitType: "dsc" };
  } else if (circuitName.startsWith("vc_and_disclose")) {
    if (circuitName === "vc_and_disclose_id") {
      return { attestationId: AttestationId.EU_ID_CARD, typeId: 0, circuitType: "vc_and_disclose" };
    } else if (circuitName === "vc_and_disclose_aadhaar") {
      return { attestationId: AttestationId.AADHAAR, typeId: 0, circuitType: "vc_and_disclose" };
    } else {
      return { attestationId: AttestationId.E_PASSPORT, typeId: 0, circuitType: "vc_and_disclose" };
    }
  }
  throw new Error(`Unknown circuit type: ${circuitName}`);
};

const ids = (() => {
  let id = 0;
  return () => {
    id++;
    return "a" + id.toString();
  };
})();

export function updateHubVerifiers(m: IgnitionModuleBuilder, hubAddress: string, deployedAddresses: any) {
  const hubContract = m.contractAt("IdentityVerificationHubImplV2", hubAddress);

  // Get all deployed verifiers
  const verifiers: Record<string, any> = {};

  for (const circuitName of Object.keys(circuitIds) as CircuitName[]) {
    const [shouldDeploy] = circuitIds[circuitName];
    if (!shouldDeploy) continue;

    const verifierName = `Verifier_${circuitName}`;
    const verifierAddress = deployedAddresses[`DeployAllVerifiers#${verifierName}`];

    if (verifierAddress) {
      verifiers[circuitName] = verifierAddress;
    }
  }

  // Prepare batch arrays for register circuit verifiers
  const registerAttestationIds: string[] = [];
  const registerTypeIds: number[] = [];
  const registerVerifierAddresses: string[] = [];

  // Prepare batch arrays for DSC circuit verifiers
  const dscAttestationIds: string[] = [];
  const dscTypeIds: number[] = [];
  const dscVerifierAddresses: string[] = [];

  // Process all verifiers and categorize them
  for (const [circuitName, verifierAddress] of Object.entries(verifiers)) {
    const { attestationId, typeId, circuitType } = getCircuitType(circuitName as CircuitName);

    if (circuitType === "register") {
      registerAttestationIds.push(attestationId);
      registerTypeIds.push(typeId);
      registerVerifierAddresses.push(verifierAddress);
    } else if (circuitType === "dsc") {
      // Add for passport
      dscAttestationIds.push(AttestationId.E_PASSPORT);
      dscTypeIds.push(typeId);
      dscVerifierAddresses.push(verifierAddress);

      // Add for ID card
      dscAttestationIds.push(AttestationId.EU_ID_CARD);
      dscTypeIds.push(typeId);
      dscVerifierAddresses.push(verifierAddress);
    }
  }

  // Batch update register circuit verifiers
  if (registerAttestationIds.length > 0) {
    m.call(hubContract, "batchUpdateRegisterCircuitVerifiers", [
      registerAttestationIds,
      registerTypeIds,
      registerVerifierAddresses,
    ]);
  }

  // Batch update DSC circuit verifiers
  if (dscAttestationIds.length > 0) {
    m.call(hubContract, "batchUpdateDscCircuitVerifiers", [dscAttestationIds, dscTypeIds, dscVerifierAddresses]);
  }

  // Update VC and Disclose circuit verifiers (no batch function available)
  for (const [circuitName, verifierAddress] of Object.entries(verifiers)) {
    const { attestationId, typeId, circuitType } = getCircuitType(circuitName as CircuitName);

    if (circuitType === "vc_and_disclose") {
      m.call(hubContract, "updateVcAndDiscloseCircuit", [attestationId, verifierAddress], { id: ids() });
    }
  }

  return hubContract;
}

export default buildModule("UpdateVerifiers", (m) => {
  const chainId = hre.network.config.chainId;

  const deployedAddressesPath = path.join(__dirname, `../../deployments/chain-${chainId}/deployed_addresses.json`);
  const deployedAddresses = JSON.parse(readFileSync(deployedAddressesPath, "utf8"));

  // Get the hub address
  //do I get the hub or the implementation address?
  const hubAddress = deployedAddresses["DeployHubV2#IdentityVerificationHub"];

  if (!hubAddress) {
    throw new Error("Hub address not found in deployed addresses");
  }

  const hubContract = updateHubVerifiers(m, hubAddress, deployedAddresses);

  return {
    hubContract,
  };
});
