import { Signer } from "ethers";
import type { PassportData } from "@selfxyz/common/utils/types";

import type { PublicSignals, Groth16Proof } from "snarkjs";

import {
  IdentityVerificationHub,
  IdentityVerificationHubImplV1,
  IdentityVerificationHubImplV2,
  IdentityRegistry,
  IdentityRegistryImplV1,
  IdentityRegistryIdCardImplV1,
  TestSelfVerificationRoot,
  Verifier_vc_and_disclose_staging as LocalVerifier,
  Verifier_vc_and_disclose_id_staging as LocalIdCardVerifier,
  Verifier_vc_and_disclose as ProdVerifier,
  Verifier_vc_and_disclose_id as ProdIdCardVerifier,
  Verifier_register_sha256_sha256_sha256_rsa_65537_4096 as ProdRegisterVerifier,
  Verifier_register_sha256_sha256_sha256_rsa_65537_4096_staging as LocalRegisterVerifier,
  Verifier_register_id_sha256_sha256_sha256_rsa_65537_4096 as ProdIdCardRegisterVerifier,
  Verifier_register_id_sha256_sha256_sha256_rsa_65537_4096_staging as LocalIdCardRegisterVerifier,
  Verifier_dsc_sha256_rsa_65537_4096 as ProdDscVerifier,
  Verifier_dsc_sha256_rsa_65537_4096_staging as LocalDscVerifier,
  IIdentityVerificationHubV1,
  IIdentityVerificationHubV2,
  IIdentityRegistryIdCardV1,
  IIdentityRegistryV1,
  IRegisterCircuitVerifier,
  IDscCircuitVerifier,
  IVcAndDiscloseCircuitVerifier,
  IdentityRegistryAadhaarImplV1,
} from "../../typechain-types";

import { DscVerifierId, RegisterVerifierId } from "@selfxyz/common";

export type PassportProof = IIdentityVerificationHubV1.PassportProofStruct;
export type RegisterCircuitProof = IRegisterCircuitVerifier.RegisterCircuitProofStruct;
export type RegisterAadhaarCircuitProof = IRegisterCircuitVerifier.RegisterAadhaarCircuitProofStruct;
export type DscCircuitProof = IDscCircuitVerifier.DscCircuitProofStruct;
export type VcAndDiscloseHubProof = IIdentityVerificationHubV1.VcAndDiscloseHubProofStruct;
export type VcAndDiscloseProof = IVcAndDiscloseCircuitVerifier.VcAndDiscloseProofStruct;

// Type definitions
export type VcAndDiscloseVerifier = typeof process.env.TEST_ENV extends "local" ? LocalVerifier : ProdVerifier;
export type VcAndDiscloseIdVerifier = typeof process.env.TEST_ENV extends "local"
  ? LocalIdCardVerifier
  : ProdIdCardVerifier;
export type RegisterVerifier = typeof process.env.TEST_ENV extends "local"
  ? LocalRegisterVerifier
  : ProdRegisterVerifier;
export type IdCardRegisterVerifier = typeof process.env.TEST_ENV extends "local"
  ? LocalIdCardRegisterVerifier
  : ProdIdCardRegisterVerifier;
export type DscVerifier = typeof process.env.TEST_ENV extends "local" ? LocalDscVerifier : ProdDscVerifier;

export interface DeployedActors {
  hub: IdentityVerificationHubImplV1;
  hubImpl: IdentityVerificationHubImplV1;
  registry: IdentityRegistryImplV1;
  registryImpl: IdentityRegistryImplV1;
  vcAndDisclose: VcAndDiscloseVerifier;
  register: RegisterVerifier;
  dsc: DscVerifier;
  owner: Signer;
  user1: Signer;
  user2: Signer;
  mockPassport: PassportData;
}

export interface DeployedActorsV2 {
  hubImplV2: IdentityVerificationHubImplV2;
  hub: IdentityVerificationHubImplV2;
  registryImpl: IdentityRegistryImplV1;
  registry: IdentityRegistryImplV1;
  registryIdImpl: IdentityRegistryIdCardImplV1;
  registryId: IdentityRegistryIdCardImplV1;
  registryAadhaarImpl: IdentityRegistryAadhaarImplV1;
  registryAadhaar: IdentityRegistryAadhaarImplV1;
  vcAndDisclose: VcAndDiscloseVerifier;
  vcAndDiscloseAadhaar: VcAndDiscloseAadhaarVerifier;
  aadhaarPubkey: bigint;
  vcAndDiscloseId: VcAndDiscloseIdVerifier;
  register: RegisterVerifier;
  registerId: RegisterVerifierId;
  dsc: DscVerifier;
  dscId: DscVerifierId;
  testSelfVerificationRoot: TestSelfVerificationRoot;
  customVerifier: any;
  owner: Signer;
  user1: Signer;
  user2: Signer;
  mockPassport: PassportData;
}

// Contract type exports
export type {
  IdentityVerificationHub,
  IdentityVerificationHubImplV1,
  IdentityVerificationHubImplV2,
  IdentityRegistry,
  IdentityRegistryImplV1,
  IdentityRegistryIdCardImplV1,
  TestSelfVerificationRoot,
  Groth16Proof,
  PublicSignals,
};

export type CircuitArtifacts = {
  [key: string]: {
    wasm: string;
    zkey: string;
    vkey: string;
    verifier?: any;
    inputs?: any;
    parsedCallData?: any;
    formattedCallData?: any;
  };
};
