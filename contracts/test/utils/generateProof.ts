import fs from "fs";
import path from "path";
import { poseidon2, poseidon3 } from "poseidon-lite";
import type { CircuitSignals, Groth16Proof, PublicSignals } from "snarkjs";
import { groth16 } from "snarkjs";
import { PassportData } from "@selfxyz/common/utils/types";
import { CircuitArtifacts, DscCircuitProof, RegisterCircuitProof, VcAndDiscloseProof } from "./types.js";
import { prepareAadhaarDiscloseTestData, prepareAadhaarRegisterTestData } from "@selfxyz/common";

import { BigNumberish } from "ethers";
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from "@selfxyz/common/utils/circuits/generateInputs";
import { getCircuitNameFromPassportData } from "@selfxyz/common/utils/circuits/circuitsName";
import serialized_csca_tree from "../../../common/pubkeys/serialized_csca_tree.json";
import serialized_dsc_tree from "../../../common/pubkeys/serialized_dsc_tree.json";
import { GenericProofStructStruct } from "../../typechain-types/contracts/IdentityVerificationHubImplV2.js";
const { LeanIMT, ChildNodes } = require("@openpassport/zk-kit-lean-imt");
const { SMT } = require("@openpassport/zk-kit-smt");

const registerCircuits: CircuitArtifacts = {
  register_sha256_sha256_sha256_rsa_65537_4096: {
    wasm: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_js/register_sha256_sha256_sha256_rsa_65537_4096.wasm",
    zkey: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_final.zkey",
    vkey: "../circuits/build/register/register_sha256_sha256_sha256_rsa_65537_4096/register_sha256_sha256_sha256_rsa_65537_4096_vkey.json",
  },
};
const registerCircuitsId: CircuitArtifacts = {
  register_id_sha256_sha256_sha256_rsa_65537_4096: {
    wasm: "../circuits/build/register_id/register_id_sha256_sha256_sha256_rsa_65537_4096/register_id_sha256_sha256_sha256_rsa_65537_4096_js/register_id_sha256_sha256_sha256_rsa_65537_4096.wasm",
    zkey: "../circuits/build/register_id/register_id_sha256_sha256_sha256_rsa_65537_4096/register_id_sha256_sha256_sha256_rsa_65537_4096_final.zkey",
    vkey: "../circuits/build/register_id/register_id_sha256_sha256_sha256_rsa_65537_4096/register_id_sha256_sha256_sha256_rsa_65537_4096_vkey.json",
  },
};

const registerCircuitsAadhaar: CircuitArtifacts = {
  register_aadhaar: {
    wasm: "../circuits/build/register/register_aadhaar/register_aadhaar_js/register_aadhaar.wasm",
    zkey: "../circuits/build/register/register_aadhaar/register_aadhaar_final.zkey",
    vkey: "../circuits/build/register/register_aadhaar/register_aadhaar_vkey.json",
  },
};

const dscCircuits: CircuitArtifacts = {
  dsc_sha256_rsa_65537_4096: {
    wasm: "../circuits/build/dsc/dsc_sha256_rsa_65537_4096/dsc_sha256_rsa_65537_4096_js/dsc_sha256_rsa_65537_4096.wasm",
    zkey: "../circuits/build/dsc/dsc_sha256_rsa_65537_4096/dsc_sha256_rsa_65537_4096_final.zkey",
    vkey: "../circuits/build/dsc/dsc_sha256_rsa_65537_4096/dsc_sha256_rsa_65537_4096_vkey.json",
  },
};
const vcAndDiscloseCircuits: CircuitArtifacts = {
  vc_and_disclose: {
    wasm: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_js/vc_and_disclose.wasm",
    zkey: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_final.zkey",
    vkey: "../circuits/build/disclose/vc_and_disclose/vc_and_disclose_vkey.json",
  },
};
const vcAndDiscloseIdCircuits: CircuitArtifacts = {
  vc_and_disclose_id: {
    wasm: "../circuits/build/disclose/vc_and_disclose_id/vc_and_disclose_id_js/vc_and_disclose_id.wasm",
    zkey: "../circuits/build/disclose/vc_and_disclose_id/vc_and_disclose_id_final.zkey",
    vkey: "../circuits/build/disclose/vc_and_disclose_id/vc_and_disclose_id_vkey.json",
  },
};

const vcAndDiscloseCircuitsAadhaar: CircuitArtifacts = {
  vc_and_disclose_aadhaar: {
    wasm: "../circuits/build/disclose/vc_and_disclose_aadhaar/vc_and_disclose_aadhaar_js/vc_and_disclose_aadhaar.wasm",
    zkey: "../circuits/build/disclose/vc_and_disclose_aadhaar/vc_and_disclose_aadhaar_final.zkey",
    vkey: "../circuits/build/disclose/vc_and_disclose_aadhaar/vc_and_disclose_aadhaar_vkey.json",
  },
};

export async function generateRegisterProof(secret: string, passportData: PassportData): Promise<RegisterCircuitProof> {
  // Get the circuit inputs
  const registerCircuitInputs: CircuitSignals = await generateCircuitInputsRegister(
    secret,
    passportData,
    serialized_dsc_tree as string,
  );

  // Generate the proof
  const registerProof: {
    proof: Groth16Proof;
    publicSignals: PublicSignals;
  } = await groth16.fullProve(
    registerCircuitInputs,
    registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].wasm,
    registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].zkey,
  );

  // Verify the proof
  const vKey = JSON.parse(
    fs.readFileSync(registerCircuits["register_sha256_sha256_sha256_rsa_65537_4096"].vkey, "utf8"),
  );
  const isValid = await groth16.verify(vKey, registerProof.publicSignals, registerProof.proof);
  if (!isValid) {
    throw new Error("Generated register proof verification failed");
  }

  const rawCallData = await groth16.exportSolidityCallData(registerProof.proof, registerProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as RegisterCircuitProof);

  return fixedProof;
}

export async function generateRegisterIdProof(
  secret: string,
  passportData: PassportData,
): Promise<RegisterCircuitProof> {
  // Get the correct circuit name based on passport data
  const circuitName = getCircuitNameFromPassportData(passportData, "register");

  // Get the circuit inputs for ID card - passportData should already be parsed from genMockIdDocAndInitDataParsing
  const registerCircuitInputs: CircuitSignals = await generateCircuitInputsRegister(
    secret,
    passportData,
    serialized_dsc_tree as string,
  );

  // Use the correct circuit artifacts based on the generated circuit name
  let circuitArtifacts;
  let artifactKey;

  // Check if this is an ID circuit
  if (circuitName.startsWith("register_id_")) {
    circuitArtifacts = registerCircuitsId;
    // Use the actual circuit name as the key
    artifactKey = circuitName;
  } else {
    circuitArtifacts = registerCircuits;
    artifactKey = "register_sha256_sha256_sha256_rsa_65537_4096";
  }

  // Generate the proof
  const registerProof: {
    proof: Groth16Proof;
    publicSignals: PublicSignals;
  } = await groth16.fullProve(
    registerCircuitInputs,
    circuitArtifacts[artifactKey].wasm,
    circuitArtifacts[artifactKey].zkey,
  );

  // Verify the proof
  const vKey = JSON.parse(fs.readFileSync(circuitArtifacts[artifactKey].vkey, "utf8"));
  const isValid = await groth16.verify(vKey, registerProof.publicSignals, registerProof.proof);
  if (!isValid) {
    throw new Error("Generated register ID proof verification failed");
  }

  const rawCallData = await groth16.exportSolidityCallData(registerProof.proof, registerProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as RegisterCircuitProof);

  return fixedProof;
}

export async function generateRegisterAadhaarProof(
  secret: string,
  //return type of prepareAadhaarTestData
  inputs: ReturnType<typeof prepareAadhaarRegisterTestData>["inputs"],
): Promise<GenericProofStructStruct> {
  const circuitName = "register_aadhaar";

  const circuitArtifacts = registerCircuitsAadhaar;
  const artifactKey = circuitName;

  const registerProof = await groth16.fullProve(
    inputs,
    circuitArtifacts[artifactKey].wasm,
    circuitArtifacts[artifactKey].zkey,
  );

  const vKey = JSON.parse(fs.readFileSync(circuitArtifacts[artifactKey].vkey, "utf8"));
  const isValid = await groth16.verify(vKey, registerProof.publicSignals, registerProof.proof);
  if (!isValid) {
    throw new Error("Generated register Aadhaar proof verification failed");
  }

  const rawCallData = await groth16.exportSolidityCallData(registerProof.proof, registerProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as GenericProofStructStruct);

  return fixedProof;
}

export async function generateDscProof(passportData: PassportData): Promise<DscCircuitProof> {
  const dscCircuitInputs: CircuitSignals = await generateCircuitInputsDSC(passportData, serialized_csca_tree);

  const dscProof = await groth16.fullProve(
    dscCircuitInputs,
    dscCircuits["dsc_sha256_rsa_65537_4096"].wasm,
    dscCircuits["dsc_sha256_rsa_65537_4096"].zkey,
  );

  // Verify the proof
  const vKey = JSON.parse(fs.readFileSync(dscCircuits["dsc_sha256_rsa_65537_4096"].vkey, "utf8"));
  const isValid = await groth16.verify(vKey, dscProof.publicSignals, dscProof.proof);
  if (!isValid) {
    throw new Error("Generated DSC proof verification failed");
  }

  const rawCallData = await groth16.exportSolidityCallData(dscProof.proof, dscProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as DscCircuitProof);

  return fixedProof;
}

export async function generateVcAndDiscloseRawProof(
  secret: string,
  attestationId: string,
  passportData: PassportData,
  scope: string,
  selectorDg1: string[] = new Array(93).fill("1"),
  selectorOlderThan: string | number = "1",
  merkletree: typeof LeanIMT,
  majority: string = "20",
  passportNo_smt?: typeof SMT,
  nameAndDob_smt?: typeof SMT,
  nameAndYob_smt?: typeof SMT,
  selectorOfac: string | number = "1",
  forbiddenCountriesList: string[] = ["AAA"],
  userIdentifier: string = "0000000000000000000000000000000000000000",
): Promise<{
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}> {
  // Initialize all three SMTs if not provided
  if (!passportNo_smt || !nameAndDob_smt || !nameAndYob_smt) {
    const smts = getSMTs();
    passportNo_smt = smts.passportNo_smt;
    nameAndDob_smt = smts.nameAndDob_smt;
    nameAndYob_smt = smts.nameAndYob_smt;
  }

  const vcAndDiscloseCircuitInputs: CircuitSignals = generateCircuitInputsVCandDisclose(
    secret,
    attestationId,
    passportData,
    scope,
    selectorDg1,
    selectorOlderThan,
    merkletree,
    majority,
    passportNo_smt,
    nameAndDob_smt,
    nameAndYob_smt,
    selectorOfac,
    forbiddenCountriesList,
    userIdentifier,
  );

  const vcAndDiscloseProof = await groth16.fullProve(
    vcAndDiscloseCircuitInputs,
    vcAndDiscloseCircuits["vc_and_disclose"].wasm,
    vcAndDiscloseCircuits["vc_and_disclose"].zkey,
  );

  // Verify the proof
  const vKey = JSON.parse(fs.readFileSync(vcAndDiscloseCircuits["vc_and_disclose"].vkey, "utf8"));
  const isValid = await groth16.verify(vKey, vcAndDiscloseProof.publicSignals, vcAndDiscloseProof.proof);
  if (!isValid) {
    throw new Error("Generated VC and Disclose proof verification failed");
  }

  return vcAndDiscloseProof;
}

export async function generateVcAndDiscloseProof(
  secret: string,
  attestationId: string,
  passportData: PassportData,
  scope: string,
  selectorDg1: string[] = new Array(93).fill("1"),
  selectorOlderThan: string | number = "1",
  merkletree: typeof LeanIMT,
  majority: string = "20",
  passportNo_smt?: typeof SMT,
  nameAndDob_smt?: typeof SMT,
  nameAndYob_smt?: typeof SMT,
  selectorOfac: string | number = "1",
  forbiddenCountriesList: string[] = [
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
  ],
  userIdentifier: string = "0000000000000000000000000000000000000000",
): Promise<VcAndDiscloseProof> {
  const rawProof = await generateVcAndDiscloseRawProof(
    secret,
    attestationId,
    passportData,
    scope,
    selectorDg1,
    selectorOlderThan,
    merkletree,
    majority,
    passportNo_smt,
    nameAndDob_smt,
    nameAndYob_smt,
    selectorOfac,
    forbiddenCountriesList,
    userIdentifier,
  );

  const rawCallData = await groth16.exportSolidityCallData(rawProof.proof, rawProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as VcAndDiscloseProof);

  return fixedProof;
}

export async function generateVcAndDiscloseIdProof(
  secret: string,
  attestationId: string,
  passportData: PassportData,
  scope: string,
  selectorDg1: string[] = new Array(90).fill("1"),
  selectorOlderThan: string | number = "1",
  merkletree: typeof LeanIMT,
  majority: string = "20",
  passportNo_smt?: typeof SMT,
  nameAndDob_smt?: typeof SMT,
  nameAndYob_smt?: typeof SMT,
  selectorOfac: string | number = "1",
  forbiddenCountriesList: string[] = [
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "AAA",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
    "000",
  ],
  userIdentifier: string = "0000000000000000000000000000000000000000",
): Promise<VcAndDiscloseProof> {
  // Initialize all three SMTs if not provided
  if (!passportNo_smt || !nameAndDob_smt || !nameAndYob_smt) {
    const smts = getSMTs();
    passportNo_smt = smts.passportNo_smt;
    nameAndDob_smt = smts.nameAndDob_smt;
    nameAndYob_smt = smts.nameAndYob_smt;
  }

  const idCardPassportData = {
    ...passportData,
    documentType: passportData.documentType.includes("id") ? passportData.documentType : "id_card",
    documentCategory: "id_card" as const,
  };

  const vcAndDiscloseCircuitInputs: CircuitSignals = generateCircuitInputsVCandDisclose(
    secret,
    attestationId,
    idCardPassportData,
    scope,
    selectorDg1,
    selectorOlderThan,
    merkletree,
    majority,
    passportNo_smt,
    nameAndDob_smt,
    nameAndYob_smt,
    selectorOfac,
    forbiddenCountriesList,
    userIdentifier,
  );

  const vcAndDiscloseProof = await groth16.fullProve(
    vcAndDiscloseCircuitInputs,
    vcAndDiscloseIdCircuits["vc_and_disclose_id"].wasm,
    vcAndDiscloseIdCircuits["vc_and_disclose_id"].zkey,
  );

  // Verify the proof
  const vKey = JSON.parse(fs.readFileSync(vcAndDiscloseIdCircuits["vc_and_disclose_id"].vkey, "utf8"));
  const isValid = await groth16.verify(vKey, vcAndDiscloseProof.publicSignals, vcAndDiscloseProof.proof);
  if (!isValid) {
    throw new Error("Generated VC and Disclose ID proof verification failed");
  }

  const rawCallData = await groth16.exportSolidityCallData(vcAndDiscloseProof.proof, vcAndDiscloseProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as VcAndDiscloseProof);

  return fixedProof;
}

export async function generateVcAndDiscloseAadhaarProof(
  inputs: ReturnType<typeof prepareAadhaarDiscloseTestData>["inputs"],
): Promise<GenericProofStructStruct> {
  const circuitName = "vc_and_disclose_aadhaar";

  const circuitArtifacts = vcAndDiscloseCircuitsAadhaar;
  const artifactKey = circuitName;

  const vcAndDiscloseProof = await groth16.fullProve(
    inputs,
    circuitArtifacts[artifactKey].wasm,
    circuitArtifacts[artifactKey].zkey,
  );

  const vKey = JSON.parse(fs.readFileSync(circuitArtifacts[artifactKey].vkey, "utf8"));
  const isValid = await groth16.verify(vKey, vcAndDiscloseProof.publicSignals, vcAndDiscloseProof.proof);
  if (!isValid) {
    throw new Error("Generated register Aadhaar proof verification failed");
  }

  const rawCallData = await groth16.exportSolidityCallData(vcAndDiscloseProof.proof, vcAndDiscloseProof.publicSignals);
  const fixedProof = parseSolidityCalldata(rawCallData, {} as GenericProofStructStruct);

  return fixedProof;
}

export function parseSolidityCalldata<T>(rawCallData: string, _type: T): T {
  const parsed = JSON.parse("[" + rawCallData + "]");

  return {
    a: parsed[0].map((x: string) => x.replace(/"/g, "")) as [BigNumberish, BigNumberish],
    b: parsed[1].map((arr: string[]) => arr.map((x: string) => x.replace(/"/g, ""))) as [
      [BigNumberish, BigNumberish],
      [BigNumberish, BigNumberish],
    ],
    c: parsed[2].map((x: string) => x.replace(/"/g, "")) as [BigNumberish, BigNumberish],
    pubSignals: parsed[3].map((x: string) => {
      const cleaned = x.replace(/"/g, "");
      // Convert hex strings to decimal strings for Solidity compatibility
      if (cleaned.startsWith("0x")) {
        return BigInt(cleaned).toString();
      }
      return cleaned;
    }) as BigNumberish[],
  } as T;
}

export function getSMTs() {
  const passportNo_smt = importSMTFromJsonFile(
    "../circuits/tests/consts/ofac/passportNoAndNationalitySMT.json",
  ) as typeof SMT;
  const nameAndDob_smt = importSMTFromJsonFile("../circuits/tests/consts/ofac/nameAndDobSMT.json") as typeof SMT;
  const nameAndYob_smt = importSMTFromJsonFile("../circuits/tests/consts/ofac/nameAndYobSMT.json") as typeof SMT;
  const nameDobAadhar_smt = importSMTFromJsonFile(
    "../circuits/tests/consts/ofac/nameAndDobAadhaarSMT.json",
  ) as typeof SMT;
  const nameYobAadhar_smt = importSMTFromJsonFile(
    "../circuits/tests/consts/ofac/nameAndYobAadhaarSMT.json",
  ) as typeof SMT;
  const nameAndDob_id_smt = importSMTFromJsonFile("../circuits/tests/consts/ofac/nameAndDobSMT_ID.json") as typeof SMT;
  const nameAndYob_id_smt = importSMTFromJsonFile("../circuits/tests/consts/ofac/nameAndYobSMT_ID.json") as typeof SMT;

  return {
    passportNo_smt,
    nameAndDob_smt,
    nameAndYob_smt,
    nameAndDob_id_smt,
    nameAndYob_id_smt,
    nameDobAadhar_smt,
    nameYobAadhar_smt,
  };
}

function importSMTFromJsonFile(filePath?: string): typeof SMT | null {
  try {
    const jsonString = fs.readFileSync(path.resolve(process.cwd(), filePath as string), "utf8");

    const data = JSON.parse(jsonString);

    const hash2 = (childNodes: typeof ChildNodes) =>
      childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);
    const smt = new SMT(hash2, true);
    smt.import(data);

    return smt;
  } catch (error) {
    return null;
  }
}
