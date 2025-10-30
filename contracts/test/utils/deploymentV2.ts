import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DscVerifierId, RegisterVerifierId } from "@selfxyz/common/constants";
import { genAndInitMockPassportData } from "@selfxyz/common/utils/passports/genMockPassportData";
import { getCscaTreeRoot } from "@selfxyz/common/utils/trees";
import { PassportData } from "@selfxyz/common/utils/types";
import { getSMTs } from "./generateProof";
import serialized_csca_tree from "../../../common/pubkeys/serialized_csca_tree.json";
import { DeployedActorsV2 } from "./types";

// Verifier artifacts (local staging)
import VcAndDiscloseVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/disclose/Verifier_vc_and_disclose_staging.sol/Verifier_vc_and_disclose_staging.json";
import VcAndDiscloseIdVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/disclose/Verifier_vc_and_disclose_id_staging.sol/Verifier_vc_and_disclose_id_staging.json";
import VcAndDiscloseAadhaarVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/disclose/Verifier_vc_and_disclose_aadhaar_staging.sol/Verifier_vc_and_disclose_aadhaar_staging.json";
import RegisterVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/register/Verifier_register_sha256_sha256_sha256_rsa_65537_4096_staging.sol/Verifier_register_sha256_sha256_sha256_rsa_65537_4096_staging.json";
import RegisterIdVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/register_id/Verifier_register_id_sha256_sha256_sha256_rsa_65537_4096_staging.sol/Verifier_register_id_sha256_sha256_sha256_rsa_65537_4096_staging.json";
import RegisterAadhaarVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/register/Verifier_register_aadhaar_staging.sol/Verifier_register_aadhaar_staging.json";
import DscVerifierArtifactLocal from "../../artifacts/contracts/verifiers/local/staging/dsc/Verifier_dsc_sha256_rsa_65537_4096_staging.sol/Verifier_dsc_sha256_rsa_65537_4096_staging.json";

export async function deploySystemFixturesV2(): Promise<DeployedActorsV2> {
  let identityVerificationHubV2: any;
  let identityVerificationHubImplV2: any;
  let identityRegistryProxy: any;
  let identityRegistryImpl: any;
  let identityRegistryIdProxy: any;
  let identityRegistryIdImpl: any;
  let identityRegistryAadhaarImpl: any;
  let identityRegistryAadhaarProxy: any;
  let vcAndDiscloseVerifier: any;
  let vcAndDiscloseIdVerifier: any;
  let vcAndDiscloseAadhaarVerifier: any;
  let registerVerifier: any;
  let registerIdVerifier: any;
  let registerAadhaarVerifier: any;
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

  // Deploy verifiers using artifacts
  let vcAndDiscloseVerifierArtifact;
  {
    vcAndDiscloseVerifierArtifact = VcAndDiscloseVerifierArtifactLocal;
    const vcAndDiscloseVerifierFactory = await ethers.getContractFactory(
      vcAndDiscloseVerifierArtifact.abi,
      vcAndDiscloseVerifierArtifact.bytecode,
    );
    vcAndDiscloseVerifier = await vcAndDiscloseVerifierFactory.connect(owner).deploy();
    await vcAndDiscloseVerifier.waitForDeployment();
  }

  let vcAndDiscloseIdVerifierArtifact;
  // // Deploy VC and Disclose ID verifier
  {
    vcAndDiscloseIdVerifierArtifact = VcAndDiscloseIdVerifierArtifactLocal;
    const vcAndDiscloseIdVerifierFactory = await ethers.getContractFactory(
      vcAndDiscloseIdVerifierArtifact.abi,
      vcAndDiscloseIdVerifierArtifact.bytecode,
    );
    vcAndDiscloseIdVerifier = await vcAndDiscloseIdVerifierFactory.connect(owner).deploy();
    await vcAndDiscloseIdVerifier.waitForDeployment();
  }

  let vcAndDiscloseAadhaarVerifierArtifact;
  {
    vcAndDiscloseAadhaarVerifierArtifact = VcAndDiscloseAadhaarVerifierArtifactLocal;
    const vcAndDiscloseAadhaarVerifierFactory = await ethers.getContractFactory(
      vcAndDiscloseAadhaarVerifierArtifact.abi,
      vcAndDiscloseAadhaarVerifierArtifact.bytecode,
    );
    vcAndDiscloseAadhaarVerifier = await vcAndDiscloseAadhaarVerifierFactory.connect(owner).deploy();
    await vcAndDiscloseAadhaarVerifier.waitForDeployment();
  }

  // Deploy register verifier
  let registerVerifierArtifact, registerVerifierFactory;
  {
    registerVerifierArtifact = RegisterVerifierArtifactLocal;
    registerVerifierFactory = await ethers.getContractFactory(
      registerVerifierArtifact.abi,
      registerVerifierArtifact.bytecode,
    );
    registerVerifier = await registerVerifierFactory.connect(owner).deploy();
    await registerVerifier.waitForDeployment();
  }

  // Deploy register ID verifier
  let registerIdVerifierArtifact, registerIdVerifierFactory;
  {
    registerIdVerifierArtifact = RegisterIdVerifierArtifactLocal;
    registerIdVerifierFactory = await ethers.getContractFactory(
      registerIdVerifierArtifact.abi,
      registerIdVerifierArtifact.bytecode,
    );
    registerIdVerifier = await registerIdVerifierFactory.connect(owner).deploy();
    await registerIdVerifier.waitForDeployment();
  }

  // Deploy register aadhaar verifier
  let registerAadhaarVerifierArtifact, registerAadhaarVerifierFactory;
  {
    registerAadhaarVerifierArtifact = RegisterAadhaarVerifierArtifactLocal;
    registerAadhaarVerifierFactory = await ethers.getContractFactory(
      registerAadhaarVerifierArtifact.abi,
      registerAadhaarVerifierArtifact.bytecode,
    );
    registerAadhaarVerifier = await registerAadhaarVerifierFactory.connect(owner).deploy();
    await registerAadhaarVerifier.waitForDeployment();
  }

  // Deploy dsc verifier
  let dscVerifierArtifact, dscVerifierFactory;
  {
    dscVerifierArtifact = DscVerifierArtifactLocal;
    dscVerifierFactory = await ethers.getContractFactory(dscVerifierArtifact.abi, dscVerifierArtifact.bytecode);
    dscVerifier = await dscVerifierFactory.connect(owner).deploy();
    await dscVerifier.waitForDeployment();
  }

  let poseidonT3Factory, poseidonT3, CustomVerifierFactory, customVerifier, GenericFormatterFactory, genericFormatter;
  {
    // Deploy PoseidonT3
    poseidonT3Factory = await ethers.getContractFactory("PoseidonT3");
    poseidonT3 = await poseidonT3Factory.connect(owner).deploy();
    await poseidonT3.waitForDeployment();

    // Deploy CustomVerifier library
    CustomVerifierFactory = await ethers.getContractFactory("CustomVerifier");
    customVerifier = await CustomVerifierFactory.connect(owner).deploy();
    await customVerifier.waitForDeployment();

    // Deploy GenericFormatter library
    GenericFormatterFactory = await ethers.getContractFactory("GenericFormatter");
    genericFormatter = await GenericFormatterFactory.connect(owner).deploy();
    await genericFormatter.waitForDeployment();
  }

  // Deploy IdentityRegistryImplV1 (same registry as V1)
  let IdentityRegistryImplFactory;
  {
    IdentityRegistryImplFactory = await ethers.getContractFactory("IdentityRegistryImplV1", {
      libraries: {
        PoseidonT3: poseidonT3.target,
      },
    });
    identityRegistryImpl = await IdentityRegistryImplFactory.connect(owner).deploy();
    await identityRegistryImpl.waitForDeployment();
  }

  // Deploy IdentityRegistryIdCardImplV1 for ID cards
  let IdentityRegistryIdImplFactory;
  {
    IdentityRegistryIdImplFactory = await ethers.getContractFactory("IdentityRegistryIdCardImplV1", {
      libraries: {
        PoseidonT3: poseidonT3.target,
      },
    });
    identityRegistryIdImpl = await IdentityRegistryIdImplFactory.connect(owner).deploy();
    await identityRegistryIdImpl.waitForDeployment();
  }
  // Deploy IdentityRegistryAadhaarImplV1 for Aadhaar
  let IdentityRegistryAadhaarImplFactory;
  {
    IdentityRegistryAadhaarImplFactory = await ethers.getContractFactory("IdentityRegistryAadhaarImplV1", {
      libraries: {
        PoseidonT3: poseidonT3.target,
      },
    });
    identityRegistryAadhaarImpl = await IdentityRegistryAadhaarImplFactory.connect(owner).deploy();
    await identityRegistryAadhaarImpl.waitForDeployment();
  }

  // Deploy IdentityVerificationHubImplV2
  let IdentityVerificationHubImplV2Factory;
  {
    IdentityVerificationHubImplV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV2", {
      libraries: {
        CustomVerifier: customVerifier.target,
      },
    });
    identityVerificationHubImplV2 = await IdentityVerificationHubImplV2Factory.connect(owner).deploy();
    await identityVerificationHubImplV2.waitForDeployment();
  }

  // Deploy registry with temporary hub address
  const temporaryHubAddress = "0x0000000000000000000000000000000000000000";

  let registryInitData, registryProxyFactory;
  {
    registryInitData = identityRegistryImpl.interface.encodeFunctionData("initialize", [temporaryHubAddress]);
    registryProxyFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistryProxy = await registryProxyFactory
      .connect(owner)
      .deploy(identityRegistryImpl.target, registryInitData);
    await identityRegistryProxy.waitForDeployment();
  }

  // Deploy ID card registry with temporary hub address
  let registryIdInitData, registryIdProxyFactory;
  {
    registryIdInitData = identityRegistryIdImpl.interface.encodeFunctionData("initialize", [temporaryHubAddress]);
    registryIdProxyFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistryIdProxy = await registryIdProxyFactory
      .connect(owner)
      .deploy(identityRegistryIdImpl.target, registryIdInitData);
    await identityRegistryIdProxy.waitForDeployment();
  }

  // Deploy Aadhaar registry with temporary hub address
  let registryAadhaarInitData, registryAadhaarProxyFactory;
  {
    registryAadhaarInitData = identityRegistryAadhaarImpl.interface.encodeFunctionData("initialize", [
      temporaryHubAddress,
    ]);
    registryAadhaarProxyFactory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistryAadhaarProxy = await registryAadhaarProxyFactory
      .connect(owner)
      .deploy(identityRegistryAadhaarImpl.target, registryAadhaarInitData);
    await identityRegistryAadhaarProxy.waitForDeployment();
  }

  // Deploy hub V2 with simple initialization (V2 has different initialization)
  let initializeDataV2, hubFactory;
  {
    initializeDataV2 = identityVerificationHubImplV2.interface.encodeFunctionData("initialize");
    hubFactory = await ethers.getContractFactory("IdentityVerificationHub");
    identityVerificationHubV2 = await hubFactory
      .connect(owner)
      .deploy(identityVerificationHubImplV2.target, initializeDataV2);
    await identityVerificationHubV2.waitForDeployment();
  }

  // Get contracts with implementation ABI and update hub address
  let registryContract, updateHubTx;
  {
    registryContract = await ethers.getContractAt("IdentityRegistryImplV1", identityRegistryProxy.target);
    updateHubTx = await registryContract.updateHub(identityVerificationHubV2.target);
    await updateHubTx.wait();
  }

  let registryIdContract, updateIdHubTx;
  {
    registryIdContract = await ethers.getContractAt("IdentityRegistryIdCardImplV1", identityRegistryIdProxy.target);
    updateIdHubTx = await registryIdContract.updateHub(identityVerificationHubV2.target);
    await updateIdHubTx.wait();
  }

  let registryAadhaarContract, updateAadhaarHubTx;
  {
    registryAadhaarContract = await ethers.getContractAt(
      "IdentityRegistryAadhaarImplV1",
      identityRegistryAadhaarProxy.target,
    );
    updateAadhaarHubTx = await registryAadhaarContract.updateHub(identityVerificationHubV2.target);
    await updateAadhaarHubTx.wait();
  }

  let hubContract;
  {
    hubContract = (await ethers.getContractAt(
      "IdentityVerificationHubImplV2",
      identityVerificationHubV2.target,
    )) as any;
  }

  const aadhaarPubkeyCommitment = 12397794382419667016026900764163476829279863250483208201417901884850986023254n;
  const aadhaarExpiryTimestamp = 2071211409839n;

  // Initialize roots
  const csca_root = getCscaTreeRoot(serialized_csca_tree);
  await registryContract.updateCscaRoot(csca_root, { from: owner });
  await registryIdContract.updateCscaRoot(csca_root, { from: owner });
  await registryAadhaarContract.registerUidaiPubkeyCommitment(aadhaarPubkeyCommitment, {
    from: owner,
  });

  const { passportNo_smt, nameAndDob_smt, nameAndYob_smt, nameDobAadhar_smt, nameYobAadhar_smt } = getSMTs();

  // Update passport roots
  await registryContract.updatePassportNoOfacRoot(passportNo_smt.root, { from: owner });
  await registryContract.updateNameAndDobOfacRoot(nameAndDob_smt.root, { from: owner });
  await registryIdContract.updateNameAndDobOfacRoot(nameAndDob_smt.root, { from: owner });

  // Update id card roots
  await registryContract.updateNameAndYobOfacRoot(nameAndYob_smt.root, { from: owner });
  await registryIdContract.updateNameAndYobOfacRoot(nameAndYob_smt.root, { from: owner });

  // Update Aadhaar roots
  await registryAadhaarContract.updateNameAndDobOfacRoot(nameDobAadhar_smt.root, { from: owner });
  await registryAadhaarContract.updateNameAndYobOfacRoot(nameYobAadhar_smt.root, { from: owner });

  // Register verifiers with the hub
  const E_PASSPORT = ethers.hexlify(ethers.zeroPadValue(ethers.toBeHex(1), 32));
  const EU_ID_CARD = ethers.hexlify(ethers.zeroPadValue(ethers.toBeHex(2), 32));
  const AADHAAR = ethers.hexlify(ethers.zeroPadValue(ethers.toBeHex(3), 32));

  // Update registries in the hub
  await hubContract.updateRegistry(E_PASSPORT, identityRegistryProxy.target);
  await hubContract.updateRegistry(EU_ID_CARD, identityRegistryIdProxy.target);
  await hubContract.updateRegistry(AADHAAR, identityRegistryAadhaarProxy.target);

  // Update VC and Disclose verifiers
  await hubContract.updateVcAndDiscloseCircuit(E_PASSPORT, vcAndDiscloseVerifier.target);
  await hubContract.updateVcAndDiscloseCircuit(EU_ID_CARD, vcAndDiscloseIdVerifier.target);
  await hubContract.updateVcAndDiscloseCircuit(AADHAAR, vcAndDiscloseAadhaarVerifier.target);

  // Update register verifiers
  await hubContract.updateRegisterCircuitVerifier(
    E_PASSPORT,
    RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    registerVerifier.target,
  );
  await hubContract.updateRegisterCircuitVerifier(
    EU_ID_CARD,
    RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    registerIdVerifier.target,
  );
  await hubContract.updateRegisterCircuitVerifier(AADHAAR, 0, registerAadhaarVerifier.target);

  // Update DSC verifiers
  await hubContract.updateDscVerifier(E_PASSPORT, DscVerifierId.dsc_sha256_rsa_65537_4096, dscVerifier.target);
  // Add DSC verifier for EU_ID_CARD as well
  await hubContract.updateDscVerifier(EU_ID_CARD, DscVerifierId.dsc_sha256_rsa_65537_4096, dscVerifier.target);

  // Deploy TestSelfVerificationRoot
  const testRootFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
  testSelfVerificationRoot = await testRootFactory.deploy(identityVerificationHubV2.target, "test-scope");
  await testSelfVerificationRoot.waitForDeployment();

  // Set the scope using the deployed PoseidonT3 library
  await testSelfVerificationRoot.testGenerateScope(poseidonT3.target, "test-scope");

  return {
    hubImplV2: identityVerificationHubImplV2,
    hub: hubContract,
    registryImpl: identityRegistryImpl,
    registry: registryContract,
    registryIdImpl: identityRegistryIdImpl,
    registryId: registryIdContract,
    registryAadhaarImpl: identityRegistryAadhaarImpl,
    registryAadhaar: registryAadhaarContract,
    vcAndDisclose: vcAndDiscloseVerifier,
    vcAndDiscloseId: vcAndDiscloseIdVerifier,
    vcAndDiscloseAadhaar: vcAndDiscloseAadhaarVerifier,
    aadhaarPubkey: aadhaarPubkeyCommitment,
    register: registerVerifier,
    registerId: RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
    dsc: dscVerifier,
    dscId: DscVerifierId.dsc_sha256_rsa_65537_4096,
    testSelfVerificationRoot: testSelfVerificationRoot,
    customVerifier: customVerifier,
    owner: owner as any,
    user1: user1 as any,
    user2: user2 as any,
    mockPassport: mockPassport,
  };
}
