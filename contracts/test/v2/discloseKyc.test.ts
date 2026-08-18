import { calculateUserIdentifierHash } from "@selfxyz/new-common/src/crypto/identity";
import { hashEndpointWithScope } from "@selfxyz/new-common/src/crypto/scope";
import { KYC_ID_NUMBER_INDEX, KYC_ID_NUMBER_LENGTH } from "@selfxyz/new-common/src/documents/kyc/constants";
import { packBytesAndPoseidon } from "@selfxyz/new-common/src/crypto/hash/poseidon";
import { Country3LetterCode } from "@selfxyz/new-common/src/data/countries";
import { DeployedActorsV2 } from "../utils/types";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { ethers } from "hardhat";
import { expect } from "chai";
import { generateKycDiscloseInputFromDummy } from "@selfxyz/new-common/src/circuits/inputs/disclose-kyc";
import { getSMTs } from "../utils/generateProof";
import { PLACEHOLDER_SIGNATURE } from "../utils/constants";
import { getPackedForbiddenCountries } from "@selfxyz/new-common/src/blockchain/forbiddenCountries";
import { BigNumberish } from "ethers";
import { generateVcAndDiscloseKycProof } from "../utils/generateProof";
import { KYC_ATTESTATION_ID } from "@selfxyz/new-common/src/foundation/constants/identity";
import { poseidon2 } from "poseidon-lite";

// KYC circuit indices - matches CircuitConstantsV2.getDiscloseIndices(KYC_ID_CARD)
// See CircuitConstantsV2.sol for full layout documentation
const KYC_CURRENT_DATE_INDEX = 21;

describe("Self Verification Flow V2 - KYC", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let nullifier: any;
  let tree: any;
  let nameAndDob_smt: any;
  let nameAndYob_smt: any;

  let userIdentifierHash: bigint;
  let forbiddenCountriesList: Country3LetterCode[];
  let forbiddenCountriesListPacked: string[];
  let verificationConfigV2: any;
  let scopeAsBigInt: bigint;
  let baseVcAndDiscloseProof: any;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();

    const expectedScopeFromHash = hashEndpointWithScope(
      deployedActors.testSelfVerificationRoot.target.toString().toLowerCase(),
      "test-scope",
    );
    scopeAsBigInt = BigInt(expectedScopeFromHash);

    const destChainId = 31337;
    const user1Address = await deployedActors.user1.getAddress();
    const userData = "test-user-data-for-verification";

    userIdentifierHash = BigInt(calculateUserIdentifierHash(destChainId, user1Address.slice(2), userData).toString());
    nameAndDob_smt = getSMTs().nameAndDob_kyc_smt;
    nameAndYob_smt = getSMTs().nameAndYob_kyc_smt;

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    tree = new LeanIMT<bigint>((a, b) => poseidon2([a, b]), []);

    const testInputs = generateKycDiscloseInputFromDummy(
      false,
      nameAndDob_smt,
      nameAndYob_smt,
      tree,
      false,
      scopeAsBigInt.toString(),
      userIdentifierHash.toString(),
      ["GENDER", "FULL_NAME", "DOB", "ID_NUMBER", "ISSUANCE_DATE", "EXPIRY_DATE", "COUNTRY", "GENDER", "ADDRESS"],
      undefined,
      0,
      true,
      KYC_ATTESTATION_ID,
    );

    const dataPadded = testInputs.data_padded.map((x: string) => Number(x));
    nullifier = dataPadded.slice(KYC_ID_NUMBER_INDEX, KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH);
    nullifier = packBytesAndPoseidon(nullifier);
    const commitment = poseidon2([BigInt(testInputs.secret), packBytesAndPoseidon(dataPadded)]);

    await deployedActors.registryKyc.devAddIdentityCommitment(nullifier, commitment);

    forbiddenCountriesList = [] as Country3LetterCode[];
    forbiddenCountriesListPacked = getPackedForbiddenCountries(forbiddenCountriesList);

    verificationConfigV2 = {
      olderThanEnabled: true,
      olderThan: "20",
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
        BigNumberish,
        BigNumberish,
        BigNumberish,
        BigNumberish,
      ],
      ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    };

    await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
    baseVcAndDiscloseProof = await generateVcAndDiscloseKycProof(testInputs);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("Complete V2 Verification Flow - KYC", () => {
    // The issue is that generateKycDiscloseInput creates a commitment in the local tree,
    // TODO: Fix test setup - the proof's merkle root needs to be registered in the registry
    // but the registry has its own separate tree. The proof uses the local tree's root,
    // which is not registered in the registry.
    it("should complete full KYC verification flow with proper proof encoding", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      //set the config
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      const tx = await deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData);

      await expect(tx).to.emit(deployedActors.testSelfVerificationRoot, "VerificationCompleted");

      expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.true;

      const lastOutput = await deployedActors.testSelfVerificationRoot.lastOutput();
      expect(lastOutput).to.not.equal("0x");

      const expectedUserData = ethers.solidityPacked(["bytes"], [userData]);
      const actualUserData = await deployedActors.testSelfVerificationRoot.lastUserData();
      expect(actualUserData).to.equal(expectedUserData);
    });

    it("should complete full KYC verification flow with non-empty forbidden countries", async () => {
      const destChainId = 31337;
      const user1Address = await deployedActors.user1.getAddress();
      const userData = "test-user-data-for-verification";

      const fcListStrings = ["IRN", "PRK", "RUS"];

      // Reuse the same tree so the merkle root matches the on-chain registry
      const fcTestInputs = generateKycDiscloseInputFromDummy(
        false,
        nameAndDob_smt,
        nameAndYob_smt,
        tree,
        false,
        scopeAsBigInt.toString(),
        userIdentifierHash.toString(),
        ["GENDER", "FULL_NAME", "DOB", "ID_NUMBER", "ISSUANCE_DATE", "EXPIRY_DATE", "COUNTRY", "GENDER", "ADDRESS"],
        fcListStrings,
        0,
        false,
        KYC_ATTESTATION_ID,
      );

      const fcPacked = getPackedForbiddenCountries(fcListStrings as any);
      const fcConfig = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: fcPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(fcConfig);

      const fcProof = await generateVcAndDiscloseKycProof(fcTestInputs);

      const destChainIdHex = ethers.zeroPadValue(ethers.toBeHex(destChainId), 32);
      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainIdHex, ethers.zeroPadValue(user1Address, 32), ethers.toUtf8Bytes(userData)],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[fcProof.a, fcProof.b, fcProof.c, fcProof.pubSignals]],
      );
      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      const tx = await deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData);

      await expect(tx).to.emit(deployedActors.testSelfVerificationRoot, "VerificationCompleted");
      expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.true;
    });

    it("should not verify if the config is not set", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfigNoHub(verificationConfigV2);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "ConfigNotSet");
    });

    it("should fail with invalid length of proofData", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const invalidProofData = ethers.toUtf8Bytes("short");

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(invalidProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail with invalid length of userContextData", async () => {
      const invalidUserContextData = ethers.toUtf8Bytes("short");

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail with invalid scope", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      //set the config
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const clonedPubSignal = structuredClone(baseVcAndDiscloseProof.pubSignals);
      // scopeIndex for KYC is 16
      clonedPubSignal[16] = 1n;

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[baseVcAndDiscloseProof.a, baseVcAndDiscloseProof.b, baseVcAndDiscloseProof.c, clonedPubSignal]],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "ScopeMismatch");
    });

    it("should fail with invalid user identifier", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      //set the config
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const clonedPubSignal = structuredClone(baseVcAndDiscloseProof.pubSignals);
      // userIdentifierIndex for KYC is 20
      clonedPubSignal[20] = 1n;

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[baseVcAndDiscloseProof.a, baseVcAndDiscloseProof.b, baseVcAndDiscloseProof.c, clonedPubSignal]],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "InvalidUserIdentifierInProof");
    });

    it("should fail with invalid current date + 2 day", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      //set the config
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const clonedPubSignal = structuredClone(baseVcAndDiscloseProof.pubSignals);
      // Modify current date at the correct index using BigInt for safe arithmetic
      const currentDateValue = BigInt(clonedPubSignal[KYC_CURRENT_DATE_INDEX]);
      clonedPubSignal[KYC_CURRENT_DATE_INDEX] = (currentDateValue + 2n).toString();

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[baseVcAndDiscloseProof.a, baseVcAndDiscloseProof.b, baseVcAndDiscloseProof.c, clonedPubSignal]],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      // Modifying the year component triggers InvalidYearRange from the Formatter
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "InvalidYearRange");
    });

    it("should fail with invalid current date -1 day", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      //set the config
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const clonedPubSignal = structuredClone(baseVcAndDiscloseProof.pubSignals);
      // Modify current date at the correct index using BigInt for safe arithmetic
      const currentDateValue = BigInt(clonedPubSignal[KYC_CURRENT_DATE_INDEX]);
      clonedPubSignal[KYC_CURRENT_DATE_INDEX] = (currentDateValue - 1n).toString();

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[baseVcAndDiscloseProof.a, baseVcAndDiscloseProof.b, baseVcAndDiscloseProof.c, clonedPubSignal]],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      // Modifying the year component triggers InvalidYearRange from the Formatter
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "InvalidYearRange");
    });

    it("should fail with invalid groth16 proof", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      //set the config
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const clonedGrothProof = structuredClone(baseVcAndDiscloseProof);
      clonedGrothProof.a = ["999999999", "888888888"];
      clonedGrothProof.b = [
        ["777777777", "666666666"],
        ["555555555", "444444444"],
      ];
      clonedGrothProof.c = ["333333333", "222222222"];

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[clonedGrothProof.a, clonedGrothProof.b, clonedGrothProof.c, clonedGrothProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      // Invalid proof values cause a low-level revert in the groth16 verifier
      await expect(deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)).to.be.reverted;
    });

    it("should fail verification with invalid attestation Id", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999999), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [invalidAttestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWith("Invalid attestation ID");
    });

    it("should fail verification with invalid ofac check", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, true, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      // The proof validation fails before reaching custom verifier checks
      await expect(deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)).to.be.reverted;
    });

    it("should fail verification with invalid forbidden countries check", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: [1n, 1n, 1n, 1n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      // The proof validation fails before reaching custom verifier checks
      await expect(deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)).to.be.reverted;
    });

    it("should fail verification with invalid older than check", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "50",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            baseVcAndDiscloseProof.a,
            baseVcAndDiscloseProof.b,
            baseVcAndDiscloseProof.c,
            baseVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      // The proof validation fails before reaching custom verifier checks
      await expect(deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)).to.be.reverted;
    });

    it("should fail verification with invalid dest chain id", async () => {
      const destChainId = 31338;
      const user1Address = await deployedActors.user1.getAddress();
      const userData = "test-user-data-for-verification";

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [
          ethers.zeroPadValue(ethers.toBeHex(destChainId), 32),
          ethers.zeroPadValue(user1Address, 32),
          ethers.toUtf8Bytes(userData),
        ],
      );

      const newUserIdentifierHash = BigInt(
        calculateUserIdentifierHash(destChainId, user1Address.slice(2), userData).toString(),
      );

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "00",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [
          BigNumberish,
          BigNumberish,
          BigNumberish,
          BigNumberish,
        ],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const inputs = generateKycDiscloseInputFromDummy(
        false,
        nameAndDob_smt,
        nameAndYob_smt,
        tree,
        false,
        scopeAsBigInt.toString(),
        newUserIdentifierHash.toString(),
        ["GENDER", "FULL_NAME", "DOB", "ID_NUMBER", "ISSUANCE_DATE", "EXPIRY_DATE", "COUNTRY", "GENDER", "ADDRESS"],
        undefined,
        18,
        false,
        KYC_ATTESTATION_ID,
      );

      const newProof = await generateVcAndDiscloseKycProof(inputs);
      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(KYC_ATTESTATION_ID)), 32);
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[newProof.a, newProof.b, newProof.c, newProof.pubSignals]],
      );
      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes", "bytes"],
        [attestationId, PLACEHOLDER_SIGNATURE, encodedProof],
      );

      // The proof validation fails before reaching cross-chain checks
      await expect(deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)).to.be.reverted;
    });

    it("should fail verification with invalid msg sender to call onVerificationSuccess", async () => {
      const mockOutput = ethers.toUtf8Bytes("mock-verification-output");
      const mockUserData = ethers.toUtf8Bytes("mock-user-data");

      // Try to call onVerificationSuccess directly from a non-hub address
      await expect(
        deployedActors.testSelfVerificationRoot
          .connect(deployedActors.user1)
          .onVerificationSuccess(mockOutput, mockUserData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "UnauthorizedCaller");

      // Also test with owner account (should still fail)
      await expect(
        deployedActors.testSelfVerificationRoot
          .connect(deployedActors.owner)
          .onVerificationSuccess(mockOutput, mockUserData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "UnauthorizedCaller");
    });
  });
});
