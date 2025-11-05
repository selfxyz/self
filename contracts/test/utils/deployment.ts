import { Signer } from "ethers";
import { ethers } from "hardhat";
import { DscVerifierId, RegisterVerifierId } from "@selfxyz/common/constants";
import { genAndInitMockPassportData } from "@selfxyz/common/utils/passports/genMockPassportData";
import { getCscaTreeRoot } from "@selfxyz/common/utils/trees";
import { PassportData } from "@selfxyz/common/utils/types";
import serialized_csca_tree from "../../../common/pubkeys/serialized_csca_tree.json";
import { getSMTs } from "./generateProof";
import {
  DeployedActors,
  DscVerifier,
  IdentityRegistry,
  IdentityRegistryImplV1,
  IdentityVerificationHub,
  IdentityVerificationHubImplV1,
  RegisterVerifier,
  VcAndDiscloseVerifier,
} from "./types";

// Verifier artifacts
import VcAndDiscloseVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/disclose/Verifier_vc_and_disclose_staging.sol/Verifier_vc_and_disclose_staging.json";
// import VcAndDiscloseVerifierArtifactProd from "../../artifacts/contracts/verifiers/disclose/Verifier_vc_and_disclose.sol/Verifier_vc_and_disclose.json";
import RegisterVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/register/Verifier_register_sha256_sha256_sha256_rsa_65537_4096_staging.sol/Verifier_register_sha256_sha256_sha256_rsa_65537_4096_staging.json";
// import RegisterVerifierArtifactProd from "../../artifacts/contracts/verifiers/register/Verifier_register_rsa_65537_sha256.sol/Verifier_register_rsa_65537_sha256.json";
import DscVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/dsc/Verifier_dsc_sha256_rsa_65537_4096_staging.sol/Verifier_dsc_sha256_rsa_65537_4096_staging.json";
// import DscVerifierArtifactProd from "../../artifacts/contracts/verifiers/dsc/Verifier_dsc_sha256_rsa_65537_4096.sol/Verifier_dsc_sha256_rsa_65537_4096.json";

export async function deploySystemFixtures(): Promise<DeployedActors> {
  let identityVerificationHubProxy: IdentityVerificationHub;
  let identityVerificationHubImpl: IdentityVerificationHubImplV1;
  let identityRegistryProxy: IdentityRegistry;
  let identityRegistryImpl: IdentityRegistryImplV1;
  let vcAndDiscloseVerifier: VcAndDiscloseVerifier;
  let registerVerifier: RegisterVerifier;
  let dscVerifier: DscVerifier;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let mockPassport: PassportData;

  [owner, user1, user2] = await ethers.getSigners();

  const newBalance = "0x" + ethers.parseEther("10000").toString(16);

  await ethers.provider.send("hardhat_setBalance", [await owner.getAddress(), newBalance]);
  await ethers.provider.send("hardhat_setBalance", [await user1.getAddress(), newBalance]);
  await ethers.provider.send("hardhat_setBalance", [await user2.getAddress(), newBalance]);

  mockPassport = genAndInitMockPassportData("sha256", "sha256", "rsa_sha256_65537_4096", "FRA", "940131", "401031");

  // Deploy verifiers
  const vcAndDiscloseVerifierArtifact = VcAndDiscloseVerifierArtifactLocal;
  const vcAndDiscloseVerifierFactory = await ethers.getContractFactory(
    vcAndDiscloseVerifierArtifact.abi,
    vcAndDiscloseVerifierArtifact.bytecode,
    owner,
  );
  vcAndDiscloseVerifier = await vcAndDiscloseVerifierFactory.deploy();
  await vcAndDiscloseVerifier.waitForDeployment();

  // Deploy register verifier
  const registerVerifierArtifact = RegisterVerifierArtifactLocal;
  const registerVerifierFactory = await ethers.getContractFactory(
    registerVerifierArtifact.abi,
    registerVerifierArtifact.bytecode,
    owner,
  );
  registerVerifier = await registerVerifierFactory.deploy();
  await registerVerifier.waitForDeployment();

  // Deploy dsc verifier
  const dscVerifierArtifact = DscVerifierArtifactLocal;
  const dscVerifierFactory = await ethers.getContractFactory(
    dscVerifierArtifact.abi,
    dscVerifierArtifact.bytecode,
    owner,
  );
  dscVerifier = await dscVerifierFactory.deploy();
  await dscVerifier.waitForDeployment();

  // Deploy PoseidonT3
  const PoseidonT3Factory = await ethers.getContractFactory("PoseidonT3", owner);
  const poseidonT3 = await PoseidonT3Factory.deploy();
  await poseidonT3.waitForDeployment();

  // Deploy IdentityRegistryImplV1
  const IdentityRegistryImplFactory = await ethers.getContractFactory(
    "IdentityRegistryImplV1",
    {
      libraries: {
        PoseidonT3: poseidonT3.target,
      },
    },
    owner,
  );
  identityRegistryImpl = await IdentityRegistryImplFactory.deploy();
  await identityRegistryImpl.waitForDeployment();

  // Deploy IdentityVerificationHubImplV1
  const IdentityVerificationHubImplFactory = await ethers.getContractFactory("IdentityVerificationHubImplV1", owner);
  identityVerificationHubImpl = await IdentityVerificationHubImplFactory.deploy();
  await identityVerificationHubImpl.waitForDeployment();

  // Deploy registry with temporary hub address
  const temporaryHubAddress = "0x0000000000000000000000000000000000000000";
  const registryInitData = identityRegistryImpl.interface.encodeFunctionData("initialize", [temporaryHubAddress]);
  const registryProxyFactory = await ethers.getContractFactory("IdentityRegistry", owner);
  identityRegistryProxy = await registryProxyFactory.deploy(identityRegistryImpl.target, registryInitData);
  await identityRegistryProxy.waitForDeployment();

  // Deploy hub with deployed registry and verifiers
  const initializeData = identityVerificationHubImpl.interface.encodeFunctionData("initialize", [
    identityRegistryProxy.target,
    vcAndDiscloseVerifier.target,
    [RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096],
    [registerVerifier.target],
    [DscVerifierId.dsc_sha256_rsa_65537_4096],
    [dscVerifier.target],
  ]);
  const hubFactory = await ethers.getContractFactory("IdentityVerificationHub", owner);
  identityVerificationHubProxy = await hubFactory.deploy(identityVerificationHubImpl.target, initializeData);
  await identityVerificationHubProxy.waitForDeployment();

  // Get contracts with implementation ABI and update hub address
  const registryContract = (await ethers.getContractAt(
    "IdentityRegistryImplV1",
    identityRegistryProxy.target,
  )) as IdentityRegistryImplV1;
  const updateHubTx = await registryContract.updateHub(identityVerificationHubProxy.target);
  await updateHubTx.wait();

  const hubContract = (await ethers.getContractAt(
    "IdentityVerificationHubImplV1",
    identityVerificationHubProxy.target,
  )) as IdentityVerificationHubImplV1;

  // Initialize roots
  const csca_root = getCscaTreeRoot(serialized_csca_tree);
  await registryContract.updateCscaRoot(csca_root, { from: owner });
  const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

  await registryContract.updatePassportNoOfacRoot(passportNo_smt.root, { from: owner });
  await registryContract.updateNameAndDobOfacRoot(nameAndDob_smt.root, { from: owner });
  await registryContract.updateNameAndYobOfacRoot(nameAndYob_smt.root, { from: owner });

  return {
    hub: hubContract,
    hubImpl: identityVerificationHubImpl,
    registry: registryContract,
    registryImpl: identityRegistryImpl,
    vcAndDisclose: vcAndDiscloseVerifier,
    register: registerVerifier,
    dsc: dscVerifier,
    owner: owner,
    user1: user1,
    user2: user2,
    mockPassport: mockPassport,
  };
}
