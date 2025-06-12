import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DscVerifierId, RegisterVerifierId } from "../../../common/src/constants/constants";
import { genAndInitMockPassportData } from "../../../common/src/utils/passports/genMockPassportData";
import { getCscaTreeRoot } from "../../../common/src/utils/trees";
import { PassportData } from "../../../common/src/utils/types";
import { getSMTs } from "./generateProof";
import serialized_csca_tree from "./pubkeys/serialized_csca_tree.json";
import {
  DeployedActorsV2,
} from "./types";

// Verifier artifacts (same as V1)
import VcAndDiscloseVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/disclose/Verifier_vc_and_disclose.sol/Verifier_vc_and_disclose.json";
import RegisterVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/register/Verifier_register_sha256_sha256_sha256_rsa_65537_4096.sol/Verifier_register_sha256_sha256_sha256_rsa_65537_4096.json";
import DscVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/dsc/Verifier_dsc_sha256_rsa_65537_4096.sol/Verifier_dsc_sha256_rsa_65537_4096.json";

export interface DeployedActorsV2 {
  hubV2: any;
  hubImplV2: any;
  hubProxy: any;
  registry: any;
  registryImpl: any;
  registryProxy: any;
  vcAndDisclose: any;
  register: any;
  dsc: any;
  testSelfVerificationRoot: any;
  owner: HardhatEthersSigner;
  user1: HardhatEthersSigner;
  user2: HardhatEthersSigner;
  mockPassport: PassportData;
}

export async function deploySystemFixturesV2(): Promise<DeployedActorsV2> {
  let identityVerificationHubV2: any;
  let identityVerificationHubImplV2: any;
  let identityRegistryProxy: any;
  let identityRegistryImpl: any;
  let vcAndDiscloseVerifier: any;
  let registerVerifier: any;
  let dscVerifier: any;
  let testSelfVerificationRoot: any;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let mockPassport: PassportData;

  [owner, user1, user2] = await ethers.getSigners();

  const newBalance = "0x" + ethers.parseEther("10000").toString(16);

  await ethers.provider.send("hardhat_setBalance", [await owner.getAddress(), newBalance]);
  await ethers.provider.send("hardhat_setBalance", [await user1.getAddress(), newBalance]);
  await ethers.provider.send("hardhat_setBalance", [await user2.getAddress(), newBalance]);

  mockPassport = genAndInitMockPassportData("sha256", "sha256", "rsa_sha256_65537_4096", "FRA", "940131", "401031");

  // Deploy verifiers (same as V1)
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

  // Deploy IdentityRegistryImplV1 (same registry as V1)
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

  // Deploy IdentityVerificationHubImplV2
  const IdentityVerificationHubImplV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV2", owner);
  identityVerificationHubImplV2 = await IdentityVerificationHubImplV2Factory.deploy();
  await identityVerificationHubImplV2.waitForDeployment();

  // Deploy registry with temporary hub address
  const temporaryHubAddress = "0x0000000000000000000000000000000000000000";
  const registryInitData = identityRegistryImpl.interface.encodeFunctionData("initialize", [temporaryHubAddress]);
  const registryProxyFactory = await ethers.getContractFactory("IdentityRegistry", owner);
  identityRegistryProxy = await registryProxyFactory.deploy(identityRegistryImpl.target, registryInitData);
  await identityRegistryProxy.waitForDeployment();

  // Deploy hub V2 with simple initialization (V2 has different initialization)
  const initializeDataV2 = identityVerificationHubImplV2.interface.encodeFunctionData("initialize");
  const hubFactory = await ethers.getContractFactory("IdentityVerificationHub", owner);
  identityVerificationHubV2 = await hubFactory.deploy(identityVerificationHubImplV2.target, initializeDataV2);
  await identityVerificationHubV2.waitForDeployment();

  // Get contracts with implementation ABI and update hub address
  const registryContract = await ethers.getContractAt("IdentityRegistryImplV1", identityRegistryProxy.target);
  const updateHubTx = await registryContract.updateHub(identityVerificationHubV2.target);
  await updateHubTx.wait();

  const hubContract = await ethers.getContractAt("IdentityVerificationHubImplV2", identityVerificationHubV2.target);

  // Initialize roots
  const csca_root = getCscaTreeRoot(serialized_csca_tree);
  await registryContract.updateCscaRoot(csca_root, { from: owner });

  const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

  await registryContract.updatePassportNoOfacRoot(passportNo_smt.root, { from: owner });
  await registryContract.updateNameAndDobOfacRoot(nameAndDob_smt.root, { from: owner });
  await registryContract.updateNameAndYobOfacRoot(nameAndYob_smt.root, { from: owner });

  // Deploy TestSelfVerificationRoot
  const testScope = ethers.keccak256(ethers.toUtf8Bytes("test-scope"));
  const testRootFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
  testSelfVerificationRoot = await testRootFactory.deploy(identityVerificationHubV2.target, testScope);
  await testSelfVerificationRoot.waitForDeployment();

  return {
    hubV2: hubContract,
    hubImplV2: identityVerificationHubImplV2,
    hubProxy: identityVerificationHubV2,
    registry: registryContract,
    registryImpl: identityRegistryImpl,
    registryProxy: identityRegistryProxy,
    vcAndDisclose: vcAndDiscloseVerifier,
    register: registerVerifier,
    dsc: dscVerifier,
    testSelfVerificationRoot: testSelfVerificationRoot,
    owner: owner,
    user1: user1,
    user2: user2,
    mockPassport: mockPassport,
  };
}
