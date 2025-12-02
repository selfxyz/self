import { expect } from "chai";
import { ethers } from "hardhat";
import { generateVcAndDiscloseIdProof, getSMTs } from "../utils/generateProof";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
import { BigNumberish } from "ethers";
import { generateRandomFieldElement, getStartOfDayTimestamp } from "../utils/utils";
import { getPackedForbiddenCountries } from "@selfxyz/common/utils/contracts";
import { countries } from "@selfxyz/common/constants/countries";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { Country3LetterCode } from "@selfxyz/common/constants/countries";
import { createHash } from "crypto";
import { ID_CARD_ATTESTATION_ID } from "@selfxyz/common/constants/constants";
import { genMockIdDocAndInitDataParsing } from "@selfxyz/common/utils/passports/genMockIdDoc";

// Helper function to calculate user identifier hash (same as passport test)
function calculateUserIdentifierHash(userContextData: string): string {
  const sha256Hash = createHash("sha256")
    .update(Buffer.from(userContextData.slice(2), "hex"))
    .digest();
  const ripemdHash = createHash("ripemd160").update(sha256Hash).digest();
  return "0x" + ripemdHash.toString("hex").padStart(40, "0");
}

describe("Self Verification Flow V2 - ID Card", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let baseVcAndDiscloseProof: any;
  let pristineBaseVcAndDiscloseProof: any;
  let vcAndDiscloseProof: any;
  let registerSecret: any;
  ``;
  let imt: any;
  let commitment: any;
  let nullifier: any;
  let mockIdCardData: any;

  let forbiddenCountriesList: Country3LetterCode[];
  let forbiddenCountriesListPacked: string[];
  let verificationConfigV2: any;
  let scopeAsBigIntString: string;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    // Generate mock ID card data
    mockIdCardData = genMockIdDocAndInitDataParsing({
      idType: "mock_id_card",
      dgHashAlgo: "sha256",
      eContentHashAlgo: "sha256",
      signatureType: "rsa_sha256_65537_2048",
      nationality: "USA",
      birthDate: "920315",
      expiryDate: "321231",
    });

    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ID_CARD_ATTESTATION_ID.toString(), mockIdCardData);

    const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
    await deployedActors.registry
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(attestationIdBytes32, nullifier, commitment);

    await deployedActors.registryId
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(attestationIdBytes32, nullifier, commitment);

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    // must be imported dynamic since @openpassport/zk-kit-lean-imt is exclusively esm and hardhat does not support esm with typescript until version 3
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
    imt = new LeanIMT<bigint>(hashFunction);
    await imt.insert(BigInt(commitment));

    forbiddenCountriesList = [countries.AFGHANISTAN, "ABC", "CBA", "AAA"] as Country3LetterCode[];
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

    const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const user1Address = await deployedActors.user1.getAddress();
    const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

    const tempUserContextData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes"],
      [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
    );

    const userIdentifierHash = calculateUserIdentifierHash(tempUserContextData);
    const userIdentifierBigInt = BigInt(userIdentifierHash);

    const actualScope = await deployedActors.testSelfVerificationRoot.scope();
    scopeAsBigIntString = actualScope.toString();

    baseVcAndDiscloseProof = await generateVcAndDiscloseIdProof(
      registerSecret,
      ID_CARD_ATTESTATION_ID.toString(),
      mockIdCardData,
      scopeAsBigIntString,
      new Array(90).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
    );

    pristineBaseVcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
  });

  beforeEach(async () => {
    baseVcAndDiscloseProof = structuredClone(pristineBaseVcAndDiscloseProof);
    vcAndDiscloseProof = structuredClone(pristineBaseVcAndDiscloseProof);

    // Re-register the commitment after snapshot revert to ensure registry state is consistent
    // Check if commitment already exists to avoid LeafAlreadyExists error
    const currentRoot = await deployedActors.hub.getIdentityCommitmentMerkleRoot(
      ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32),
    );

    if (currentRoot.toString() === "0") {
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      await deployedActors.registry
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationIdBytes32, nullifier, commitment);

      await deployedActors.registryId
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationIdBytes32, nullifier, commitment);
    }
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("Complete V2 Verification Flow - ID Card", () => {
    it("should complete full ID card verification flow with proper proof encoding", async () => {
      // Use the already configured verificationConfigV2 and configId from before hook
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
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

    it("should fail verification with invalid configId", async () => {
      const tx = await deployedActors.testSelfVerificationRoot.setVerificationConfigNoHub(verificationConfigV2);
      await tx.wait();
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await deployedActors.testSelfVerificationRoot.resetTestState();

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "ConfigNotSet");
    });

    it("should fail verification with invalid length of proofData", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      // Create proofData with less than 32 bytes (invalid)
      const invalidProofData = ethers.toUtf8Bytes("short"); // Only 5 bytes

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(invalidProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail verification with invalid length of userContextData", async () => {
      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      // Create userContextData with less than 96 bytes (invalid)
      const invalidUserContextData = ethers.toUtf8Bytes("short_data"); // Only 10 bytes

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail verification with invalid scope", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      // Create a separate commitment and register it
      const scopeRegisterSecret = generateRandomFieldElement();
      const scopeNullifier = generateRandomFieldElement();
      const scopeCommitment = generateCommitment(
        scopeRegisterSecret,
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
      );

      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      await deployedActors.registryId
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(attestationIdBytes32, scopeNullifier, scopeCommitment);

      // Create IMT for this specific commitment
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
      const scopeIMT = new LeanIMT<bigint>(hashFunction);
      await scopeIMT.insert(BigInt(scopeCommitment));

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      // Deploy a new TestSelfVerificationRoot contract with a different scopeSeed
      const TestSelfVerificationRootFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
      const differentScopeContract = await TestSelfVerificationRootFactory.deploy(
        deployedActors.hub.target,
        "different-test-scope", // Different scopeSeed
      );
      await differentScopeContract.waitForDeployment();

      // Get the actual different scope from the deployed contract
      const differentActualScope = await differentScopeContract.scope();
      const differentScopeAsBigIntString = differentActualScope.toString();

      const differentScopeProof = await generateVcAndDiscloseIdProof(
        scopeRegisterSecret,
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        differentScopeAsBigIntString, // Different scope
        new Array(90).fill("1"),
        "1",
        scopeIMT,
        "20",
        undefined,
        undefined,
        undefined,
        undefined,
        forbiddenCountriesList,
        "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[differentScopeProof.a, differentScopeProof.b, differentScopeProof.c, differentScopeProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail with ScopeMismatch because the proof has a different scope
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "ScopeMismatch");
    });

    it("should fail verification with invalid user identifier", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: false,
        olderThan: "20",
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      // Create invalid userContextData by changing the user address to a different value
      const invalidUserAddress = await deployedActors.user2.getAddress();
      const invalidUserContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(invalidUserAddress, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the original valid proof without modification
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail with InvalidUserIdentifierInProof because the userContextData doesn't match the proof
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidUserIdentifierInProof");
    });

    it("should fail verification with invalid root", async () => {
      const verificationConfigV2 = {
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

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create proof with invalid merkle root - for ID card, merkle root is at index 10
      const modifiedVcAndDiscloseProof = { ...vcAndDiscloseProof };
      modifiedVcAndDiscloseProof.pubSignals[10] = "999999999"; // ID card merkle root index is 10

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
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

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidIdentityCommitmentRoot");
    });

    it("should fail verification with invalid current date + 1 day", async () => {
      const verificationConfigV2 = {
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

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Get current block timestamp and calculate future date
      const currentBlock = await ethers.provider.getBlock("latest");
      const oneDayAfter = getStartOfDayTimestamp(currentBlock!.timestamp) + 24 * 60 * 60;

      const date = new Date(oneDayAfter * 1000);
      const dateComponents = [
        Math.floor((date.getUTCFullYear() % 100) / 10),
        date.getUTCFullYear() % 10,
        Math.floor((date.getUTCMonth() + 1) / 10),
        (date.getUTCMonth() + 1) % 10,
        Math.floor(date.getUTCDate() / 10),
        date.getUTCDate() % 10,
      ];

      // Modify the current date fields in the proof (index 11-16 for ID card)
      for (let i = 0; i < 6; i++) {
        vcAndDiscloseProof.pubSignals[11 + i] = dateComponents[i].toString();
      }

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail with CurrentDateNotInValidRange because the date is in the future
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "CurrentDateNotInValidRange");
    });

    it("should fail verification with invalid current date - 1 day", async () => {
      const verificationConfigV2 = {
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

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Get current block timestamp and calculate past date
      const currentBlock = await ethers.provider.getBlock("latest");
      const oneDayBefore = getStartOfDayTimestamp(currentBlock!.timestamp) - 1;

      const date = new Date(oneDayBefore * 1000);
      const dateComponents = [
        Math.floor((date.getUTCFullYear() % 100) / 10),
        date.getUTCFullYear() % 10,
        Math.floor((date.getUTCMonth() + 1) / 10),
        (date.getUTCMonth() + 1) % 10,
        Math.floor(date.getUTCDate() / 10),
        date.getUTCDate() % 10,
      ];

      // Modify the current date fields in the proof (index 11-16 for ID card)
      for (let i = 0; i < 6; i++) {
        vcAndDiscloseProof.pubSignals[11 + i] = dateComponents[i].toString();
      }

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail with CurrentDateNotInValidRange because the date is in the past
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "CurrentDateNotInValidRange");
    });

    it("should fail verification with invalid groth16 proof", async () => {
      const verificationConfigV2 = {
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

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the valid proof but modify only the groth16 proof components
      // but keep the pubSignals valid so it doesn't fail at earlier checks
      const invalidGrothProof = { ...vcAndDiscloseProof };
      invalidGrothProof.a = ["999999999", "888888888"]; // Invalid proof components
      invalidGrothProof.b = [
        ["777777777", "666666666"],
        ["555555555", "444444444"],
      ];
      invalidGrothProof.c = ["333333333", "222222222"];
      // Keep pubSignals unchanged so other validations pass

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[invalidGrothProof.a, invalidGrothProof.b, invalidGrothProof.c, invalidGrothProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail with InvalidVcAndDiscloseProof because the groth16 proof is invalid
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidVcAndDiscloseProof");
    });

    it("should fail verification with invalid attestation Id", async () => {
      const verificationConfigV2 = {
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

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      // Use invalid attestation ID
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999999), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [invalidAttestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWith("Invalid attestation ID");
    });

    it("should fail verification with invalid ofac check", async () => {
      // Create a completely separate proof and setup for OFAC failure
      const verificationConfigV2 = {
        olderThanEnabled: false,
        olderThan: "20",
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, true, false] as [boolean, boolean, boolean], // ID card: [passport_no: false, name_dob: true, name_yob: false]
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the existing commitment and merkle root instead of creating new ones
      // Get OFAC SMTs that will cause validation failure
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof that will fail OFAC verification (with ofacCheck = "0") using existing IMT
      const ofacFailingProof = await generateVcAndDiscloseIdProof(
        registerSecret, // Use existing registerSecret
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        imt, // Use existing IMT
        "20",
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "0", // This will make OFAC verification fail
        forbiddenCountriesList,
        "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[ofacFailingProof.a, ofacFailingProof.b, ofacFailingProof.c, ofacFailingProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.customVerifier, "InvalidOfacCheck");
    });

    it("should fail verification with invalid forbidden countries check", async () => {
      // Create a completely separate proof and setup for forbidden countries failure
      const verificationConfigV2 = {
        olderThanEnabled: false,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish], // Empty forbidden countries list
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean], // All OFAC checks disabled
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the existing commitment and merkle root instead of creating new ones
      // Get OFAC SMTs
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof with the original forbidden countries list (this will create a mismatch) using existing commitment
      const forbiddenCountryProof = await generateVcAndDiscloseIdProof(
        registerSecret, // Use existing registerSecret
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        imt, // Use existing IMT
        "20",
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "1",
        forbiddenCountriesList, // Use the original forbidden countries list (different from config)
        "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[forbiddenCountryProof.a, forbiddenCountryProof.b, forbiddenCountryProof.c, forbiddenCountryProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail because the forbidden countries list in the proof doesn't match the config
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.customVerifier, "InvalidForbiddenCountries");
    });

    it("should fail verification with invalid older than check", async () => {
      // Create a verification config that requires age > 25, but generate proof with age 20
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "25", // Require age > 25 (our proof will have age 20)
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean], // All OFAC checks disabled
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the existing commitment and merkle root instead of creating new ones
      // Get OFAC SMTs
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof with age 20 (which is less than required 25) using existing commitment
      const youngerAgeProof = await generateVcAndDiscloseIdProof(
        registerSecret, // Use existing registerSecret
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        imt, // Use existing IMT
        "20", // Age 20, which is less than required 25
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "1",
        forbiddenCountriesList,
        "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[youngerAgeProof.a, youngerAgeProof.b, youngerAgeProof.c, youngerAgeProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail because age 20 is less than required 25
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.customVerifier, "InvalidOlderThan");
    });

    it("should fail verification with invalid dest chain Id", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: false,
        olderThan: "20",
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean], // All OFAC checks disabled
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      // Use an invalid destination chain ID that's different from current chain (31337)
      const invalidDestChainId = ethers.zeroPadValue(ethers.toBeHex(999999), 32);
      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [invalidDestChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the existing commitment and merkle root instead of creating new ones
      // Get OFAC SMTs
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof with the correct user identifier that matches the userContextData using existing commitment
      const validProof = await generateVcAndDiscloseIdProof(
        registerSecret, // Use existing registerSecret
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        imt, // Use existing IMT
        "20",
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "1",
        forbiddenCountriesList,
        "0x" + userIdentifierBigInt.toString(16).padStart(64, "0"),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[validProof.a, validProof.b, validProof.c, validProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

      // This should fail with CrossChainIsNotSupportedYet because destChainId (999999) != block.chainid (31337)
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.hub, "CrossChainIsNotSupportedYet");
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
