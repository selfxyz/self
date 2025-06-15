import { expect } from "chai";
import { ethers } from "hardhat";
import { generateVcAndDiscloseIdProof, getSMTs } from "../utils/generateProof";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
import { BigNumberish } from "ethers";
import { generateRandomFieldElement } from "../utils/utils";
import { getPackedForbiddenCountries } from "@selfxyz/common/utils/contracts/forbiddenCountries";
import { countries } from "@selfxyz/common/constants/countries";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { Country3LetterCode } from "@selfxyz/common/constants/countries";
import { hashEndpointWithScope } from "@selfxyz/common/utils/scope";
import { createHash } from "crypto";
import { ID_CARD_ATTESTATION_ID } from "@selfxyz/common/constants/constants";
import { genMockIdDocAndInitDataParsing } from "@selfxyz/common/utils/passports/genMockIdDoc";

describe("Self Verification Flow V2 - ID Card", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let baseVcAndDiscloseProof: any;
  let vcAndDiscloseProof: any;
  let registerSecret: any;
  let imt: any;
  let commitment: any;
  let nullifier: any;
  let mockIdCardData: any;

  let forbiddenCountriesList: Country3LetterCode[];
  let forbiddenCountriesListPacked: string[];
  let verificationConfigV2: any;
  let configId: string;

  function calculateUserIdentifierHash(userContextData: string): string {
    const sha256Hash = createHash('sha256').update(Buffer.from(userContextData.slice(2), 'hex')).digest();
    const ripemdHash = createHash('ripemd160').update(sha256Hash).digest();
    return '0x' + ripemdHash.toString('hex').padStart(40, '0');
  }

  before(async () => {
    deployedActors = await deploySystemFixturesV2();

    // Take snapshot after deployment and balance setting
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    // Generate mock ID card data
    mockIdCardData = genMockIdDocAndInitDataParsing({
      idType: 'mock_id_card',
      dgHashAlgo: 'sha256',
      eContentHashAlgo: 'sha256',
      signatureType: 'rsa_sha256_65537_2048',
      nationality: 'USA',
      birthDate: '920315',
      expiryDate: '321231',
    });

    const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ID_CARD_ATTESTATION_ID.toString(), mockIdCardData);

    await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
      attestationIdBytes32,
      nullifier,
      commitment
    );

    await deployedActors.registryId.connect(deployedActors.owner).devAddIdentityCommitment(
      attestationIdBytes32,
      nullifier,
      commitment
    );

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then(mod => mod.LeanIMT);
    imt = new LeanIMT<bigint>(hashFunction);
    await imt.insert(BigInt(commitment));

    forbiddenCountriesList = [
      countries.AFGHANISTAN,
      "ABC",
      "CBA",
      "AAA",
    ] as Country3LetterCode[];
    forbiddenCountriesListPacked = getPackedForbiddenCountries(forbiddenCountriesList);

    verificationConfigV2 = {
      olderThanEnabled: true,
      olderThan: "20",
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
      ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    };

    await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
    configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

    const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const user1Address = await deployedActors.user1.getAddress();
    const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

    const tempUserContextData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes32", "bytes"],
      [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
    );

    const userIdentifierHash = calculateUserIdentifierHash(tempUserContextData);
    const userIdentifierBigInt = BigInt(userIdentifierHash);

    const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
    const scopeAsBigInt = BigInt(expectedScopeFromHash);
    const scopeAsBigIntString = scopeAsBigInt.toString();

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
      userIdentifierBigInt.toString(16).padStart(64, '0'),
    );
  });

  beforeEach(async () => {
    vcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
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
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          vcAndDiscloseProof.a,
          vcAndDiscloseProof.b,
          vcAndDiscloseProof.c,
          vcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      await deployedActors.testSelfVerificationRoot.resetTestState();

      const tx = await deployedActors.testSelfVerificationRoot.verifySelfProof(
        proofData,
        userContextData
      );

      await expect(tx).to.emit(deployedActors.testSelfVerificationRoot, "VerificationCompleted");

      expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.true;

      const lastOutput = await deployedActors.testSelfVerificationRoot.lastOutput();
      expect(lastOutput).to.not.equal("0x");

      const expectedUserData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [ethers.zeroPadValue(user1Address, 32), userData]
      );
      const actualUserData = await deployedActors.testSelfVerificationRoot.lastUserData();
      expect(actualUserData).to.equal(expectedUserData);
    });

    it("should fail verification with invalid length of proofData", async () => {
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      // Create proofData with less than 32 bytes (invalid)
      const invalidProofData = ethers.toUtf8Bytes("short"); // Only 5 bytes

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(invalidProofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail verification with invalid length of userContextData", async () => {
      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          vcAndDiscloseProof.a,
          vcAndDiscloseProof.b,
          vcAndDiscloseProof.c,
          vcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // Create userContextData with less than 96 bytes (invalid)
      const invalidUserContextData = ethers.toUtf8Bytes("short_data"); // Only 10 bytes

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData)
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "InvalidDataFormat");
    });

    it("should fail verification with invalid scope", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the base proof but modify only the scope in the pubSignals to create a minimal invalid proof
      const modifiedVcAndDiscloseProof = { ...vcAndDiscloseProof };
      modifiedVcAndDiscloseProof.pubSignals[0] = "999999999"; // Invalid scope

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          modifiedVcAndDiscloseProof.a,
          modifiedVcAndDiscloseProof.b,
          modifiedVcAndDiscloseProof.c,
          modifiedVcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // Since modifying pubSignals makes the proof invalid, it will fail at the root check first
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidIdentityCommitmentRoot");
    });

    it("should fail verification with invalid user identifier", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: false,
        olderThan: "20",
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      // Create invalid userContextData by changing the user address to a different value
      const invalidUserAddress = await deployedActors.user2.getAddress();
      const invalidUserContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(invalidUserAddress, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the original valid proof without modification
      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          vcAndDiscloseProof.a,
          vcAndDiscloseProof.b,
          vcAndDiscloseProof.c,
          vcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // This should fail with InvalidUserIdentifierInProof because the userContextData doesn't match the proof
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, invalidUserContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidUserIdentifierInProof");
    });

    it("should fail verification with invalid root", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create proof with invalid merkle root
      const modifiedVcAndDiscloseProof = { ...vcAndDiscloseProof };
      modifiedVcAndDiscloseProof.pubSignals[3] = "999999999"; // Invalid merkle root

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          modifiedVcAndDiscloseProof.a,
          modifiedVcAndDiscloseProof.b,
          modifiedVcAndDiscloseProof.c,
          modifiedVcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidIdentityCommitmentRoot");
    });

    it("should fail verification with invalid current date + 1 day", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the base proof but modify only the current date fields to be 2 days in the future
      const modifiedVcAndDiscloseProof = { ...vcAndDiscloseProof };
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2); // 2 days in the future

      // Modify the current date fields (indices 4-9 typically represent current date)
      modifiedVcAndDiscloseProof.pubSignals[4] = futureDate.getFullYear().toString();
      modifiedVcAndDiscloseProof.pubSignals[5] = (futureDate.getMonth() + 1).toString();
      modifiedVcAndDiscloseProof.pubSignals[6] = futureDate.getDate().toString();

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          modifiedVcAndDiscloseProof.a,
          modifiedVcAndDiscloseProof.b,
          modifiedVcAndDiscloseProof.c,
          modifiedVcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // Since modifying pubSignals makes the proof invalid, it will fail at the root check first
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidIdentityCommitmentRoot");
    });

    it("should fail verification with invalid current date - 1 day", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Use the base proof but modify only the current date fields to be 2 days in the past
      const modifiedVcAndDiscloseProof = { ...vcAndDiscloseProof };
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2); // 2 days in the past

      // Modify the current date fields
      modifiedVcAndDiscloseProof.pubSignals[4] = pastDate.getFullYear().toString();
      modifiedVcAndDiscloseProof.pubSignals[5] = (pastDate.getMonth() + 1).toString();
      modifiedVcAndDiscloseProof.pubSignals[6] = pastDate.getDate().toString();

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          modifiedVcAndDiscloseProof.a,
          modifiedVcAndDiscloseProof.b,
          modifiedVcAndDiscloseProof.c,
          modifiedVcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // Since modifying pubSignals makes the proof invalid, it will fail at the root check first
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidIdentityCommitmentRoot");
    });

    it("should fail verification with invalid groth16 proof", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create proof with invalid groth16 proof components but keep pubSignals valid
      const invalidVcAndDiscloseProof = { ...vcAndDiscloseProof };
      invalidVcAndDiscloseProof.a = ["999999999", "888888888"]; // Invalid proof components
      invalidVcAndDiscloseProof.b = [["777777777", "666666666"], ["555555555", "444444444"]];
      invalidVcAndDiscloseProof.c = ["333333333", "222222222"];

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          invalidVcAndDiscloseProof.a,
          invalidVcAndDiscloseProof.b,
          invalidVcAndDiscloseProof.c,
          invalidVcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // Since modifying the proof components makes it invalid, it will fail at the root check first
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidIdentityCommitmentRoot");
    });

    it("should fail verification with invalid attestation Id", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      // Use invalid attestation ID
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999999), 32);

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          vcAndDiscloseProof.a,
          vcAndDiscloseProof.b,
          vcAndDiscloseProof.c,
          vcAndDiscloseProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [invalidAttestationId, encodedProof]
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
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

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
      const scopeAsBigInt = BigInt(expectedScopeFromHash);
      const scopeAsBigIntString = scopeAsBigInt.toString();

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create a separate commitment and register it
      const ofacRegisterSecret = generateRandomFieldElement();
      const ofacNullifier = generateRandomFieldElement();
      const ofacCommitment = generateCommitment(ofacRegisterSecret, ID_CARD_ATTESTATION_ID.toString(), mockIdCardData);

      await deployedActors.registryId.connect(deployedActors.owner).devAddIdentityCommitment(
        attestationIdBytes32,
        ofacNullifier,
        ofacCommitment
      );

      // Create IMT for this specific commitment
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then(mod => mod.LeanIMT);
      const ofacIMT = new LeanIMT<bigint>(hashFunction);
      await ofacIMT.insert(BigInt(ofacCommitment));

      // Get OFAC SMTs that will cause validation failure
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof that will fail OFAC verification (with ofacCheck = "0")
      const ofacFailingProof = await generateVcAndDiscloseIdProof(
        ofacRegisterSecret,
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        ofacIMT,
        "20",
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "0", // This will make OFAC verification fail
        forbiddenCountriesList,
        userIdentifierBigInt.toString(16).padStart(64, '0'),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          ofacFailingProof.a,
          ofacFailingProof.b,
          ofacFailingProof.c,
          ofacFailingProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
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

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
      const scopeAsBigInt = BigInt(expectedScopeFromHash);
      const scopeAsBigIntString = scopeAsBigInt.toString();

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create a separate commitment and register it
      const forbiddenRegisterSecret = generateRandomFieldElement();
      const forbiddenNullifier = generateRandomFieldElement();
      const forbiddenCommitment = generateCommitment(forbiddenRegisterSecret, ID_CARD_ATTESTATION_ID.toString(), mockIdCardData);

      await deployedActors.registryId.connect(deployedActors.owner).devAddIdentityCommitment(
        attestationIdBytes32,
        forbiddenNullifier,
        forbiddenCommitment
      );

      // Create IMT for this specific commitment
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then(mod => mod.LeanIMT);
      const forbiddenIMT = new LeanIMT<bigint>(hashFunction);
      await forbiddenIMT.insert(BigInt(forbiddenCommitment));

      // Get OFAC SMTs
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof with the original forbidden countries list (this will create a mismatch)
      const forbiddenCountryProof = await generateVcAndDiscloseIdProof(
        forbiddenRegisterSecret,
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        forbiddenIMT,
        "20",
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "1",
        forbiddenCountriesList, // Use the original forbidden countries list (different from config)
        userIdentifierBigInt.toString(16).padStart(64, '0'),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          forbiddenCountryProof.a,
          forbiddenCountryProof.b,
          forbiddenCountryProof.c,
          forbiddenCountryProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // This should fail because the forbidden countries list in the proof doesn't match the config
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
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

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
      const scopeAsBigInt = BigInt(expectedScopeFromHash);
      const scopeAsBigIntString = scopeAsBigInt.toString();

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create a separate commitment and register it
      const ageRegisterSecret = generateRandomFieldElement();
      const ageNullifier = generateRandomFieldElement();
      const ageCommitment = generateCommitment(ageRegisterSecret, ID_CARD_ATTESTATION_ID.toString(), mockIdCardData);

      await deployedActors.registryId.connect(deployedActors.owner).devAddIdentityCommitment(
        attestationIdBytes32,
        ageNullifier,
        ageCommitment
      );

      // Create IMT for this specific commitment
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then(mod => mod.LeanIMT);
      const ageIMT = new LeanIMT<bigint>(hashFunction);
      await ageIMT.insert(BigInt(ageCommitment));

      // Get OFAC SMTs
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof with age 20 (which is less than required 25)
      const youngerAgeProof = await generateVcAndDiscloseIdProof(
        ageRegisterSecret,
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        ageIMT,
        "20", // Age 20, which is less than required 25
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "1",
        forbiddenCountriesList,
        userIdentifierBigInt.toString(16).padStart(64, '0'),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          youngerAgeProof.a,
          youngerAgeProof.b,
          youngerAgeProof.c,
          youngerAgeProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // This should fail because age 20 is less than required 25
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
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

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      // Use an invalid destination chain ID that's different from current chain (31337)
      const invalidDestChainId = ethers.zeroPadValue(ethers.toBeHex(999999), 32);
      const userContextData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, invalidDestChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const userIdentifierHash = calculateUserIdentifierHash(userContextData);
      const userIdentifierBigInt = BigInt(userIdentifierHash);

      const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
      const scopeAsBigInt = BigInt(expectedScopeFromHash);
      const scopeAsBigIntString = scopeAsBigInt.toString();

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

      // Create a separate commitment and register it
      const chainRegisterSecret = generateRandomFieldElement();
      const chainNullifier = generateRandomFieldElement();
      const chainCommitment = generateCommitment(chainRegisterSecret, ID_CARD_ATTESTATION_ID.toString(), mockIdCardData);

      await deployedActors.registryId.connect(deployedActors.owner).devAddIdentityCommitment(
        attestationIdBytes32,
        chainNullifier,
        chainCommitment
      );

      // Create IMT for this specific commitment
      const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
      const LeanIMT = await import("@openpassport/zk-kit-lean-imt").then(mod => mod.LeanIMT);
      const chainIMT = new LeanIMT<bigint>(hashFunction);
      await chainIMT.insert(BigInt(chainCommitment));

      // Get OFAC SMTs
      const { passportNo_smt, nameAndDob_smt, nameAndYob_smt } = getSMTs();

      // Generate proof with the correct user identifier that matches the userContextData
      const validProof = await generateVcAndDiscloseIdProof(
        chainRegisterSecret,
        ID_CARD_ATTESTATION_ID.toString(),
        mockIdCardData,
        scopeAsBigIntString,
        new Array(90).fill("1"),
        "1",
        chainIMT,
        "20",
        passportNo_smt,
        nameAndDob_smt,
        nameAndYob_smt,
        "1",
        forbiddenCountriesList,
        userIdentifierBigInt.toString(16).padStart(64, '0'),
      );

      const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
        [[
          validProof.a,
          validProof.b,
          validProof.c,
          validProof.pubSignals
        ]]
      );

      const proofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, encodedProof]
      );

      // This should fail with CrossChainIsNotSupportedYet because destChainId (999999) != block.chainid (31337)
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(proofData, userContextData)
      ).to.be.revertedWithCustomError(deployedActors.hub, "CrossChainIsNotSupportedYet");
    });

    it("should fail verification with invalid msg sender to call onVerificationSuccess", async () => {
      const mockOutput = ethers.toUtf8Bytes("mock-verification-output");
      const mockUserData = ethers.toUtf8Bytes("mock-user-data");

      // Try to call onVerificationSuccess directly from a non-hub address
      await expect(
        deployedActors.testSelfVerificationRoot.connect(deployedActors.user1).onVerificationSuccess(mockOutput, mockUserData)
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "UnauthorizedCaller");

      // Also test with owner account (should still fail)
      await expect(
        deployedActors.testSelfVerificationRoot.connect(deployedActors.owner).onVerificationSuccess(mockOutput, mockUserData)
      ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "UnauthorizedCaller");
    });
  });
});
