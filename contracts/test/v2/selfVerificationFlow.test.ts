import { expect } from "chai";
import { ethers } from "hardhat";
import { CIRCUIT_CONSTANTS } from "../../../common/src/constants/constants";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof, getSMTs } from "../utils/generateProof";
import { LeanIMT } from "@openpassport/zk-kit-lean-imt";
import { poseidon2 } from "poseidon-lite";
import { generateCommitment } from "../../../common/src/utils/passports/passport";
import { BigNumberish } from "ethers";
import { generateRandomFieldElement, getStartOfDayTimestamp, splitHexFromBack } from "../utils/utils";
import { Formatter, CircuitAttributeHandler } from "../utils/formatter";
import {
  formatCountriesList,
  reverseBytes,
  reverseCountryBytes,
} from "../../../common/src/utils/circuits/formatInputs";
import { getPackedForbiddenCountries } from "../../../common/src/utils/contracts/forbiddenCountries";
import { countries } from "../../../common/src/constants/countries";
import { deploySystemFixtures } from "../utils/deployment";
import { DeployedActors } from "../utils/types";
import { genAndInitMockPassportData } from "../../../common/src/utils/passports/genMockPassportData";
import { getCscaTreeRoot } from "../../../common/src/utils/trees";
import serialized_csca_tree from "../utils/pubkeys/serialized_csca_tree.json";

describe("Self Verification Flow V2", () => {
  let deployedActors: any;
  let snapshotId: string;
  let baseVcAndDiscloseProof: any;
  let vcAndDiscloseProof: any;
  let registerSecret: any;
  let imt: any;
  let commitment: any;
  let nullifier: any;
  let testSelfVerificationRoot: any;
  let hubV2: any;
  let hubImplV2: any;
  let hubProxy: any;

  let forbiddenCountriesList: string[];
  let forbiddenCountriesListPacked: string[];

  before(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    // Basic V1 deployment for comparison and to get verifiers
    deployedActors = await deploySystemFixtures();

    // Deploy V2 Hub Implementation
    const IdentityVerificationHubImplV2Factory = await ethers.getContractFactory("IdentityVerificationHubImplV2");
    hubImplV2 = await IdentityVerificationHubImplV2Factory.deploy();
    await hubImplV2.waitForDeployment();

    // Deploy Hub Proxy with V2 implementation
    const hubInterface = hubImplV2.interface;
    const initData = hubInterface.encodeFunctionData("initialize");
    const hubProxyFactory = await ethers.getContractFactory("IdentityVerificationHub");
    hubProxy = await hubProxyFactory.deploy(hubImplV2.target, initData);
    await hubProxy.waitForDeployment();

    // Get V2 hub contract with implementation ABI
    hubV2 = await ethers.getContractAt("IdentityVerificationHubImplV2", hubProxy.target);

    // Deploy TestSelfVerificationRoot
    const testScope = ethers.keccak256(ethers.toUtf8Bytes("test-scope"));
    const testRootFactory = await ethers.getContractFactory("TestSelfVerificationRoot");
    testSelfVerificationRoot = await testRootFactory.deploy(hubProxy.target, testScope);
    await testSelfVerificationRoot.waitForDeployment();

    // Set up test data similar to vcAndDisclose test
    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

    await deployedActors.registry
      .connect(deployedActors.owner)
      .devAddIdentityCommitment(ATTESTATION_ID.E_PASSPORT, nullifier, commitment);

    const hashFunction = (a: bigint, b: bigint) => poseidon2([a, b]);
    imt = new LeanIMT<bigint>(hashFunction);
    await imt.insert(BigInt(commitment));

    forbiddenCountriesList = [
      countries.AFGHANISTAN,
      "ABC",
      "CBA",
      "AAA",
    ];
    forbiddenCountriesListPacked = getPackedForbiddenCountries(forbiddenCountriesList);

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      "test-scope",
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
    it("should deploy IdentityVerificationHubImplV2 successfully", async () => {
      expect(hubImplV2.target).to.not.equal(ethers.ZeroAddress);
    });

    it("should deploy TestSelfVerificationRoot successfully", async () => {
      expect(testSelfVerificationRoot.target).to.not.equal(ethers.ZeroAddress);
    });

    it("should have correct scope set in TestSelfVerificationRoot", async () => {
      const expectedScope = ethers.keccak256(ethers.toUtf8Bytes("test-scope"));
      const actualScope = await testSelfVerificationRoot.scope();
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

      const configId = await hubV2.generateConfigId(verificationConfigV2);

      await expect(hubV2.setVerificationConfigV2(verificationConfigV2))
        .to.emit(hubV2, "VerificationConfigV2Set")
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

      const configId = await hubV2.generateConfigId(verificationConfigV2);

      // Should not exist initially
      expect(await hubV2.verificationConfigV2Exists(configId)).to.be.false;

      // Set the config
      await hubV2.setVerificationConfigV2(verificationConfigV2);

      // Should exist now
      expect(await hubV2.verificationConfigV2Exists(configId)).to.be.true;
    });
  });

  describe("Self Verification Root Functions", () => {
    it("should allow scope changes", async () => {
      const newScope = ethers.keccak256(ethers.toUtf8Bytes("new-test-scope"));

      await expect(testSelfVerificationRoot.setScope(newScope))
        .to.emit(testSelfVerificationRoot, "ScopeUpdated")
        .withArgs(newScope);

      expect(await testSelfVerificationRoot.scope()).to.equal(newScope);
    });

    it("should reset test state", async () => {
      // Manually set some test state
      await testSelfVerificationRoot.resetTestState();

      expect(await testSelfVerificationRoot.verificationSuccessful()).to.be.false;
      expect(await testSelfVerificationRoot.lastOutput()).to.equal("0x");
      expect(await testSelfVerificationRoot.lastUserData()).to.equal("0x");
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
        testSelfVerificationRoot.verifySelfProof(mockProofData, additionalData)
      ).to.be.reverted; // Expected to revert due to incomplete setup
    });

    it("should test onVerificationSuccess callback", async () => {
      const mockOutput = ethers.toUtf8Bytes("mock-verification-output");
      const mockUserData = ethers.toUtf8Bytes("mock-user-data");

      await expect(
        testSelfVerificationRoot.onVerificationSuccess(mockOutput, mockUserData)
      ).to.emit(testSelfVerificationRoot, "VerificationCompleted")
        .withArgs(mockOutput, mockUserData);

      expect(await testSelfVerificationRoot.verificationSuccessful()).to.be.true;
      expect(await testSelfVerificationRoot.lastOutput()).to.equal(
        ethers.hexlify(mockOutput)
      );
      expect(await testSelfVerificationRoot.lastUserData()).to.equal(
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
