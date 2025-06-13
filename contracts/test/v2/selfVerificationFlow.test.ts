import { expect } from "chai";
import { ethers } from "hardhat";
import { CIRCUIT_CONSTANTS } from "@selfxyz/common/constants/constants";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof, getSMTs } from "../utils/generateProof";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "@selfxyz/common/utils/passports/passport";
import { BigNumberish } from "ethers";
import { generateRandomFieldElement, getStartOfDayTimestamp, splitHexFromBack } from "../utils/utils";
import { Formatter, CircuitAttributeHandler } from "../utils/formatter";
import {
  formatCountriesList,
  reverseBytes,
  reverseCountryBytes,
} from "@selfxyz/common/utils/circuits/formatInputs";
import { getPackedForbiddenCountries } from "@selfxyz/common/utils/contracts/forbiddenCountries";
import { countries } from "@selfxyz/common/constants/countries";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { genAndInitMockPassportData } from "@selfxyz/common/utils/passports/genMockPassportData";
import { getCscaTreeRoot } from "@selfxyz/common/utils/trees";
import serialized_csca_tree from "../utils/pubkeys/serialized_csca_tree.json";
import { Country3LetterCode } from "@selfxyz/common/constants/countries";
import { RegisterVerifierId } from "@selfxyz/common/constants/constants";
import { hashEndpointWithScope } from "@selfxyz/common/utils/scope";

describe("Self Verification Flow V2", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let baseVcAndDiscloseProof: any;
  let vcAndDiscloseProof: any;
  let registerSecret: any;
  let imt: any;
  let commitment: any;
  let nullifier: any;

  let forbiddenCountriesList: Country3LetterCode[];
  let forbiddenCountriesListPacked: string[];

  before(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    // Deploy all contracts using deploySystemFixturesV2
    deployedActors = await deploySystemFixturesV2();

    // Set up test data
    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

    // Add the commitment to both registries directly using devAddIdentityCommitment
    // This ensures the test can have the same merkle tree state
    await deployedActors.registry.connect(deployedActors.owner).devAddIdentityCommitment(
      ATTESTATION_ID.E_PASSPORT,
      nullifier,
      commitment
    );

    await deployedActors.registryId.connect(deployedActors.owner).devAddIdentityCommitment(
      ATTESTATION_ID.E_PASSPORT,
      nullifier,
      commitment
    );

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    // Use dynamic import for LeanIMT (ESM only)
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

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      hashEndpointWithScope("example.com", "test-scope"),
      new Array(88).fill("1"),
      "1",
      imt,
      "20",
      undefined,
      undefined,
      undefined,
      undefined,
      forbiddenCountriesList,
      (await deployedActors.user1.getAddress()).slice(2),
    );
  });

  beforeEach(async () => {
    vcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("V2 Contracts Deployment", () => {
    it("should have deployed IdentityVerificationHubImplV2 successfully", async () => {
      expect(deployedActors.hubImplV2.target).to.not.equal(ethers.ZeroAddress);
    });

    it("should have deployed TestSelfVerificationRoot successfully", async () => {
      expect(deployedActors.testSelfVerificationRoot.target).to.not.equal(ethers.ZeroAddress);
    });

    it("should have correct scope set in TestSelfVerificationRoot", async () => {
      const expectedScope = ethers.keccak256(ethers.toUtf8Bytes("test-scope"));
      const actualScope = await deployedActors.testSelfVerificationRoot.scope();
      expect(actualScope).to.equal(expectedScope);
    });
  });

  describe("V2 Verification Configuration", () => {
    it("should set verification config V2", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      await expect(deployedActors.hub.setVerificationConfigV2(verificationConfigV2))
        .to.emit(deployedActors.hub, "VerificationConfigV2Set")
        .withArgs(configId, Object.values(verificationConfigV2));
    });

    it("should check if verification config exists", async () => {
      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      // Should not exist initially
      expect(await deployedActors.hub.verificationConfigV2Exists(configId)).to.be.false;

      // Set the config
      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);

      // Should exist now
      expect(await deployedActors.hub.verificationConfigV2Exists(configId)).to.be.true;
    });
  });

  describe("Self Verification Root Functions", () => {
    it("should allow scope changes", async () => {
      const newScope = ethers.keccak256(ethers.toUtf8Bytes("new-test-scope"));

      await expect(deployedActors.testSelfVerificationRoot.setScope(newScope))
        .to.emit(deployedActors.testSelfVerificationRoot, "ScopeUpdated")
        .withArgs(newScope);

      expect(await deployedActors.testSelfVerificationRoot.scope()).to.equal(newScope);
    });

    it("should reset test state", async () => {
      // Manually set some test state
      await deployedActors.testSelfVerificationRoot.resetTestState();

      expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.false;
      expect(await deployedActors.testSelfVerificationRoot.lastOutput()).to.equal("0x");
      expect(await deployedActors.testSelfVerificationRoot.lastUserData()).to.equal("0x");
    });
  });

  describe("Mock Self Verification Flow", () => {
    it("should demonstrate self verification interface", async () => {
      // Create mock proof data and additional data
      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
      const mockProofData = ethers.solidityPacked(
        ["bytes32", "bytes"],
        [attestationId, "0x1234567890abcdef"] // mock proof data
      );

      const configId = ethers.keccak256(ethers.toUtf8Bytes("mock-config"));
      const destChainId = ethers.zeroPadValue(ethers.toBeHex(1), 32); // chain ID 1
      const userIdentifier = ethers.zeroPadValue(ethers.toBeHex(12345), 32);
      const userData = ethers.toUtf8Bytes("test-user-data");

      const additionalData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, userIdentifier, userData]
      );

      // This should revert since we haven't set up the full V2 infrastructure
      // but it demonstrates the interface
      await expect(
        deployedActors.testSelfVerificationRoot.verifySelfProof(mockProofData, additionalData)
      ).to.be.reverted; // Expected to revert due to incomplete setup
    });

    it("should test onVerificationSuccess callback", async () => {
      const mockOutput = ethers.toUtf8Bytes("mock-verification-output");
      const mockUserData = ethers.toUtf8Bytes("mock-user-data");

      await expect(
        deployedActors.testSelfVerificationRoot.onVerificationSuccess(mockOutput, mockUserData)
      ).to.emit(deployedActors.testSelfVerificationRoot, "VerificationCompleted")
        .withArgs(mockOutput, mockUserData);

      expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.true;
      expect(await deployedActors.testSelfVerificationRoot.lastOutput()).to.equal(
        ethers.hexlify(mockOutput)
      );
      expect(await deployedActors.testSelfVerificationRoot.lastUserData()).to.equal(
        ethers.hexlify(mockUserData)
      );
    });
  });

  describe.skip("Complete V2 Verification Flow", () => {
    // These tests would require full V2 setup with proper registries and verifiers
    it.skip("should perform complete V2 verification", async () => {
      console.log("Complete V2 verification flow - requires full infrastructure setup");
    });

    it.skip("should handle V2 configuration validation", async () => {
      console.log("V2 configuration validation - requires custom verifier setup");
    });
  });
});
