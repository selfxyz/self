import { expect } from "chai";
import { ethers } from "hardhat";
import { generateVcAndDiscloseAadhaarProof, getSMTs } from "../utils/generateProof";
import { poseidon2 } from "poseidon-lite";
import { BigNumberish } from "ethers";
import { getPackedForbiddenCountries } from "@selfxyz/common/utils/contracts/forbiddenCountries";
import { Country3LetterCode } from "@selfxyz/common/constants/countries";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { AADHAAR_ATTESTATION_ID } from "@selfxyz/common/constants/constants";
import { calculateUserIdentifierHash } from "@selfxyz/common";
import { prepareAadhaarDiscloseTestData } from "@selfxyz/common";
import path from "path";
import { createSelector } from "@selfxyz/common/utils/aadhaar/constants";
import { formatInput } from "@selfxyz/common/utils/circuits/generateInputs";
import fs from "fs";

const privateKeyPem = fs.readFileSync(
  path.join(__dirname, "../../../circuits/node_modules/anon-aadhaar-circuits/assets/testPrivateKey.pem"),
  "utf8",
);

describe("Self Verification Flow V2 - Aadhaar", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let baseVcAndDiscloseProof: any;
  let registerSecret: any;
  let imt: any;
  let commitment: any;
  let nullifier: any;

  let userIdentifierHash: bigint;
  let name: string;
  let dateOfBirth: string;
  let gender: string;
  let pincode: string;
  let state: string;
  let nameAndDob_smt: any;
  let nameAndYob_smt: any;
  let tree: any;

  let forbiddenCountriesList: Country3LetterCode[];
  let forbiddenCountriesListPacked: string[];
  let verificationConfigV2: any;
  let scopeAsBigIntString: string;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    imt = new LeanIMT<bigint>(hashFunction);

    name = "Sumit Kumar";
    dateOfBirth = "01-01-1984";
    gender = "M";
    pincode = "110051";
    state = "WB";
    registerSecret = "1234";

    tree = new LeanIMT<bigint>((a, b) => poseidon2([a, b]), []);
    nameAndDob_smt = getSMTs().nameDobAadhar_smt;
    nameAndYob_smt = getSMTs().nameYobAadhar_smt;

    const destChainId = 31337;
    const user1Address = await deployedActors.user1.getAddress();
    const userData = "test-user-data-for-verification";

    userIdentifierHash = BigInt(calculateUserIdentifierHash(destChainId, user1Address.slice(2), userData).toString());

    const actualScope = await deployedActors.testSelfVerificationRoot.scope();
    scopeAsBigIntString = actualScope.toString();

    const testData = prepareAadhaarDiscloseTestData(
      privateKeyPem,
      tree,
      nameAndDob_smt,
      nameAndYob_smt,
      scopeAsBigIntString,
      registerSecret,
      userIdentifierHash.toString(),
      createSelector([
        "GENDER",
        "NAME",
        "YEAR_OF_BIRTH",
        "MONTH_OF_BIRTH",
        "DAY_OF_BIRTH",
        "AADHAAR_LAST_4_DIGITS",
        "STATE",
      ]).toString(),
      name,
      dateOfBirth,
      gender,
      pincode,
      state,
      undefined,
      true,
    );
    const aadhaarInputs = testData.inputs;

    nullifier = testData.nullifier;
    commitment = testData.commitment;

    const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);
    await deployedActors.registryAadhaar
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(attestationIdBytes32, nullifier, commitment);

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

    baseVcAndDiscloseProof = await generateVcAndDiscloseAadhaarProof(aadhaarInputs);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("Complete V2 Verification Flow - Aadhaar", () => {
    it("should complete full Aadhaar verification flow with proper proof encoding", async () => {
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail with invalid scope", async () => {
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      // Deploy a new TestSelfVerificationRoot contract with a different scopeSeed
      const TestSelfVerificationRootFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
      const differentScopeContract = await TestSelfVerificationRootFactory.deploy(
        deployedActors.hubImplV2.target,
        "different-test-scope", // Different scopeSeed
      );
      await differentScopeContract.waitForDeployment();

      // Get the actual different scope from the deployed contract
      const differentActualScope = await differentScopeContract.scope();
      const differentScopeAsBigIntString = differentActualScope.toString();

      const aadhaarInputs = prepareAadhaarDiscloseTestData(
        privateKeyPem,
        tree,
        nameAndDob_smt,
        nameAndYob_smt,
        differentScopeAsBigIntString,
        registerSecret,
        "123",
        createSelector(["GENDER"]).toString(),
        name,
        dateOfBirth,
        gender,
        pincode,
        state,
        undefined,
        true,
      );

      const differentScopeProof = await generateVcAndDiscloseAadhaarProof(aadhaarInputs.inputs);

      const differentScopeEncodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[differentScopeProof.a, differentScopeProof.b, differentScopeProof.c, differentScopeProof.pubSignals]],
      );

      const differentScopeProofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, differentScopeEncodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(differentScopeProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "ScopeMismatch");
    });

    it("should fail with invalid user identifier", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const invalidUserAddress = await deployedActors.user2.getAddress();
      const invalidUserContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(invalidUserAddress, 32), userData],
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "InvalidUserIdentifierInProof");
    });

    it("should fail with invalid root", async () => {
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      const modifiedVcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
      modifiedVcAndDiscloseProof.pubSignals[12] = "999999999";

      const modifiedVcAndDiscloseEncodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [
          [
            modifiedVcAndDiscloseProof.a,
            modifiedVcAndDiscloseProof.b,
            modifiedVcAndDiscloseProof.c,
            modifiedVcAndDiscloseProof.pubSignals,
          ],
        ],
      );

      const modifiedVcAndDiscloseProofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, modifiedVcAndDiscloseEncodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(modifiedVcAndDiscloseProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "InvalidIdentityCommitmentRoot");
    });

    it("should fail with invalid current date + 1 day", async () => {
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const imt = new LeanIMT<bigint>(hashFunction, []);

      const aadhaarInputs = prepareAadhaarDiscloseTestData(
        privateKeyPem,
        imt,
        nameAndDob_smt,
        nameAndYob_smt,
        scopeAsBigIntString,
        registerSecret,
        userIdentifierHash.toString(),
        createSelector(["GENDER"]).toString(),
        name,
        dateOfBirth,
        gender,
        pincode,
        state,
        undefined,
        true,
      );

      aadhaarInputs.inputs.currentDay = formatInput((+aadhaarInputs.inputs.currentDay[0] + 1).toString());

      const commitment = aadhaarInputs.commitment;
      const nullifier = aadhaarInputs.nullifier;

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

      const differentScopeProof = await generateVcAndDiscloseAadhaarProof(aadhaarInputs.inputs);

      const differentScopeEncodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[differentScopeProof.a, differentScopeProof.b, differentScopeProof.c, differentScopeProof.pubSignals]],
      );

      const differentScopeProofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, differentScopeEncodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(differentScopeProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "CurrentDateNotInValidRange");
    });

    it("should fail with invalid current date - 1 day", async () => {
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const imt = new LeanIMT<bigint>(hashFunction, []);

      const aadhaarInputs = prepareAadhaarDiscloseTestData(
        privateKeyPem,
        imt,
        nameAndDob_smt,
        nameAndYob_smt,
        scopeAsBigIntString,
        registerSecret,
        userIdentifierHash.toString(),
        createSelector(["GENDER"]).toString(),
        name,
        dateOfBirth,
        gender,
        pincode,
        state,
        undefined,
        true,
      );

      const commitment = aadhaarInputs.commitment;
      const nullifier = aadhaarInputs.nullifier;

      aadhaarInputs.inputs.currentDay = formatInput((+aadhaarInputs.inputs.currentDay[0] - 1).toString());

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

      const differentScopeProof = await generateVcAndDiscloseAadhaarProof(aadhaarInputs.inputs);

      const differentScopeEncodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[differentScopeProof.a, differentScopeProof.b, differentScopeProof.c, differentScopeProof.pubSignals]],
      );

      const differentScopeProofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, differentScopeEncodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(differentScopeProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "CurrentDateNotInValidRange");
    });

    it("should fail verification with invalid groth16 proof", async () => {
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
      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

      const invalidGrothProof = { ...baseVcAndDiscloseProof };
      invalidGrothProof.a = ["999999999", "888888888"]; // Invalid proof components
      invalidGrothProof.b = [
        ["777777777", "666666666"],
        ["555555555", "444444444"],
      ];
      invalidGrothProof.c = ["333333333", "222222222"];
      // Keep pubSignals unchanged so other validations pass

      const invalidGrothProofEncodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[invalidGrothProof.a, invalidGrothProof.b, invalidGrothProof.c, invalidGrothProof.pubSignals]],
      );

      const invalidGrothProofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, invalidGrothProofEncodedProof],
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(invalidGrothProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "InvalidVcAndDiscloseProof");
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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [invalidAttestationId, encodedProof]);

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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.customVerifier, "InvalidOfacCheck");
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.customVerifier, "InvalidForbiddenCountries");
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.customVerifier, "InvalidOlderThan");
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

      const aadhaarInputs = prepareAadhaarDiscloseTestData(
        privateKeyPem,
        imt,
        nameAndDob_smt,
        nameAndYob_smt,
        scopeAsBigIntString,
        registerSecret,
        newUserIdentifierHash.toString(),
        createSelector(["GENDER"]).toString(),
        name,
        dateOfBirth,
        gender,
        pincode,
        state,
        undefined,
        true,
      );

      const commitment = aadhaarInputs.commitment;
      const nullifier = aadhaarInputs.nullifier;

      const newProof = await generateVcAndDiscloseAadhaarProof(aadhaarInputs.inputs);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(AADHAAR_ATTESTATION_ID)), 32);

      await deployedActors.registryAadhaar
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationId, nullifier, commitment);

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[newProof.a, newProof.b, newProof.c, newProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hubImplV2, "CrossChainIsNotSupportedYet");
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
