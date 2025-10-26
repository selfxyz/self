import { expect } from "chai";
import { ethers } from "hardhat";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof, getSMTs } from "../utils/generateProof";
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

// Helper function to format date for passport (YYMMDD format)
function formatDateForPassport(date: Date): string {
  const year = date.getUTCFullYear().toString().slice(-2); // Get last 2 digits of year
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0"); // Month is 0-indexed
  const day = date.getUTCDate().toString().padStart(2, "0");
  return year + month + day;
}

describe("Self Verification Flow V2", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let baseVcAndDiscloseProof: any;
  let pristineBaseVcAndDiscloseProof: any;
  let vcAndDiscloseProof: any;
  let registerSecret: any;
  let imt: any;
  let commitment: any;
  let nullifier: any;

  let forbiddenCountriesList: Country3LetterCode[];
  let forbiddenCountriesListPacked: string[];
  let verificationConfigV2: any;
  let scopeAsBigIntString: string;

  function calculateUserIdentifierHash(userContextData: string): string {
    const sha256Hash = createHash("sha256")
      .update(Buffer.from(userContextData.slice(2), "hex"))
      .digest();
    const ripemdHash = createHash("ripemd160").update(sha256Hash).digest();
    return "0x" + ripemdHash.toString("hex").padStart(40, "0");
  }

  before(async () => {
    deployedActors = await deploySystemFixturesV2();

    // Take snapshot after deployment and balance setting
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

    await deployedActors.registry
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

    await deployedActors.registryId
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
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
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
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

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      scopeAsBigIntString,
      new Array(88).fill("1"),
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
    const currentRoot = await deployedActors.hub.getIdentityCommitmentMerkleRoot(ATTESTATION_ID.E_PASSPORT);

    if (currentRoot.toString() === "0") {
      await deployedActors.registry
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

      await deployedActors.registryId
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);
    }
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("Complete V2 Verification Flow", () => {
    it("should complete full verification flow with proper proof encoding", async () => {
      // Use the already configured verificationConfigV2 and configId from before hook
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

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
      // Use the already configured verificationConfigV2 and configId from before hook
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      // Create proofData with less than 32 bytes (invalid)
      const invalidProofData = ethers.toUtf8Bytes("short"); // Only 5 bytes

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(invalidProofData, userContextData),
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail verification with invalid length of userContextData", async () => {
      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
        [[vcAndDiscloseProof.a, vcAndDiscloseProof.b, vcAndDiscloseProof.c, vcAndDiscloseProof.pubSignals]],
      );

      const proofData = ethers.solidityPacked(["bytes32", "bytes"], [attestationId, encodedProof]);

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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);

      // Create a separate commitment and register it
      const scopeRegisterSecret = generateRandomFieldElement();
      const scopeNullifier = generateRandomFieldElement();
      const scopeCommitment = generateCommitment(
        scopeRegisterSecret,
        ATTESTATION_ID.E_PASSPORT,
        deployedActors.mockPassport,
      );

      await deployedActors.registry
        .connect(deployedActors.owner)
        .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, scopeNullifier, scopeCommitment);

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

      const differentScopeProof = await generateVcAndDiscloseProof(
        scopeRegisterSecret,
        BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
        deployedActors.mockPassport,
        differentScopeAsBigIntString, // Different scope
        new Array(88).fill("1"),
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
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      // Create invalid userContextData by changing the user address to a different value
      const invalidUserAddress = await deployedActors.user2.getAddress();
      const invalidUserContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(invalidUserAddress, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

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
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      // Create a separate commitment with a different secret to generate a different merkle root
      const differentRegisterSecret = generateRandomFieldElement();
      const differentNullifier = generateRandomFieldElement();
      const differentCommitment = generateCommitment(
        differentRegisterSecret,
        ATTESTATION_ID.E_PASSPORT,
        deployedActors.mockPassport,
      );

      // Create a new IMT with different commitment (different root)
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then((mod) => mod.LeanIMT);
      const differentIMT = new LeanIMT<bigint>(hashFunction);
      await differentIMT.insert(BigInt(differentCommitment));

      // Generate proof with different merkle root
      const differentRootProof = await generateVcAndDiscloseProof(
        differentRegisterSecret,
        BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
        deployedActors.mockPassport,
        scopeAsBigIntString,
        new Array(88).fill("1"),
        "1",
        differentIMT, // Different IMT = different root
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
        [[differentRootProof.a, differentRootProof.b, differentRootProof.c, differentRootProof.pubSignals]],
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
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

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

      // Modify the current date fields directly in the proof signals (index 10-15 for E_PASSPORT)
      for (let i = 0; i < 6; i++) {
        vcAndDiscloseProof.pubSignals[10 + i] = dateComponents[i].toString();
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
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

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

      // Modify the current date fields directly in the proof signals (index 10-15 for E_PASSPORT)
      for (let i = 0; i < 6; i++) {
        vcAndDiscloseProof.pubSignals[10 + i] = dateComponents[i].toString();
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
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes"],
        [destChainId, ethers.zeroPadValue(user1Address, 32), userData],
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      // Use the valid proof but modify only the groth16 proof components to make it fail verification
      // but keep the pubSignals valid so it doesn't fail at earlier checks
      const invalidGrothProof = structuredClone(vcAndDiscloseProof);
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
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      await deployedActors.testSelfVerificationRoot.setVerificationConfig(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

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
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean], // Enable OFAC checks
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      // Use the existing commitment and merkle root instead of creating new ones
      // Get OFAC SMTs that will cause validation failure
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof that will fail OFAC verification (with ofacCheck = "0") using existing IMT
      const ofacFailingProof = await generateVcAndDiscloseProof(
        registerSecret, // Use existing registerSecret
        BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
        deployedActors.mockPassport,
        scopeAsBigIntString,
        new Array(88).fill("1"),
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
      // Create a forbidden countries list that should NOT match the proof
      const mismatchedForbiddenCountriesList = [
        countries.IRAN, // This should NOT match what's in the passport/proof
        "ABC",
        "CBA",
        "AAA",
      ] as Country3LetterCode[];
      const mismatchedForbiddenCountriesListPacked = getPackedForbiddenCountries(mismatchedForbiddenCountriesList);

      const verificationConfigV2 = {
        olderThanEnabled: false,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: mismatchedForbiddenCountriesListPacked as [
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

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      // Generate proof with the original forbidden countries list (this will create a mismatch) using existing commitment
      const forbiddenCountryProof = await generateVcAndDiscloseProof(
        registerSecret, // Use existing registerSecret
        BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
        deployedActors.mockPassport,
        scopeAsBigIntString,
        new Array(88).fill("1"),
        "1",
        imt, // Use existing IMT
        "20",
        undefined,
        undefined,
        undefined,
        undefined,
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

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      // Generate proof with age 20 (which is less than required 25) using existing commitment
      const youngerAgeProof = await generateVcAndDiscloseProof(
        registerSecret, // Use existing registerSecret
        BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
        deployedActors.mockPassport,
        scopeAsBigIntString,
        new Array(88).fill("1"),
        "1",
        imt, // Use existing IMT
        "20", // Age 20, which is less than required 25
        undefined,
        undefined,
        undefined,
        undefined,
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
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
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

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

      // Generate proof with the correct user identifier that matches the userContextData using existing commitment
      const validProof = await generateVcAndDiscloseProof(
        registerSecret, // Use existing registerSecret
        BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
        deployedActors.mockPassport,
        scopeAsBigIntString,
        new Array(88).fill("1"),
        "1",
        imt, // Use existing IMT
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
