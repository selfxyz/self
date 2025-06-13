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
import { createHash } from "crypto";

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

  function calculateUserIdentifierHash(additionalData: string): string {
    const sha256Hash = createHash('sha256').update(Buffer.from(additionalData.slice(2), 'hex')).digest();
    const ripemdHash = createHash('ripemd160').update(sha256Hash).digest();
    return '0x' + ripemdHash.toString('hex').padStart(40, '0');
  }

  before(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    deployedActors = await deploySystemFixturesV2();

    registerSecret = generateRandomFieldElement();
    nullifier = generateRandomFieldElement();
    commitment = generateCommitment(registerSecret, ATTESTATION_ID.E_PASSPORT, deployedActors.mockPassport);

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

    const verificationConfigV2 = {
      olderThanEnabled: true,
      olderThan: "20",
      forbiddenCountriesEnabled: true,
      forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
      ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    };

    await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
    const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

    const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    const user1Address = await deployedActors.user1.getAddress();
    const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

    const tempAdditionalData = ethers.solidityPacked(
      ["bytes32", "bytes32", "bytes32", "bytes"],
      [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
    );

    const userIdentifierHash = calculateUserIdentifierHash(tempAdditionalData);
    const userIdentifierBigInt = BigInt(userIdentifierHash);

    // === DEBUG SCOPE VALUES ===
    console.log("=== SCOPE DEBUG IN BEFORE() ===");
    const scopeFromTestSelfVerificationRoot = await deployedActors.testSelfVerificationRoot.scope();
    const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
    console.log("Scope from TestSelfVerificationRoot contract:", scopeFromTestSelfVerificationRoot.toString());
    console.log("Expected scope from hashEndpointWithScope:", expectedScopeFromHash.toString());
    console.log("Are they equal?:", scopeFromTestSelfVerificationRoot.toString() === expectedScopeFromHash.toString());

    // Test different ways of converting scope
    const scopeAsBigInt = BigInt(expectedScopeFromHash);
    const scopeAsBigIntString = scopeAsBigInt.toString();
    console.log("Scope as BigInt:", scopeAsBigInt.toString());
    console.log("Scope as BigInt.toString():", scopeAsBigIntString);
    console.log("About to use scope for proof generation:", scopeAsBigIntString);

    // Double-check the exact arguments being passed to generateVcAndDiscloseProof
    console.log("=== ARGUMENTS FOR PROOF GENERATION ===");
    console.log("1. registerSecret:", registerSecret);
    console.log("2. attestationId:", BigInt(ATTESTATION_ID.E_PASSPORT).toString());
    console.log("3. passportData:", typeof deployedActors.mockPassport);
    console.log("4. scope:", scopeAsBigIntString);
    console.log("5. selector_dg1 length:", new Array(88).fill("1").length);
    console.log("6. selector_older_than:", "1");
    console.log("7. imt root:", imt.root.toString());
    console.log("8. majority:", "20");
    console.log("9. passportNo_smt:", undefined);
    console.log("10. nameAndDob_smt:", undefined);
    console.log("11. nameAndYob_smt:", undefined);
    console.log("12. selector_ofac:", undefined);
    console.log("13. forbiddenCountriesList:", forbiddenCountriesList);
    console.log("14. userIdentifier:", userIdentifierBigInt.toString(16).padStart(64, '0'));
    console.log("=== END ARGUMENTS DEBUG ===");
    console.log("=== END SCOPE DEBUG IN BEFORE() ===");

    baseVcAndDiscloseProof = await generateVcAndDiscloseProof(
      registerSecret,
      BigInt(ATTESTATION_ID.E_PASSPORT).toString(),
      deployedActors.mockPassport,
      scopeAsBigIntString, // Use the converted scope
      new Array(88).fill("1"),
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

    // === VERIFY SCOPE IN GENERATED PROOF ===
    console.log("=== SCOPE IN GENERATED PROOF ===");
    console.log("Proof scope (pubSignals[19]):", baseVcAndDiscloseProof.pubSignals[19]);
    console.log("Expected scope:", expectedScopeFromHash.toString());
    console.log("Proof scope matches expected?:", baseVcAndDiscloseProof.pubSignals[19] === expectedScopeFromHash.toString());

    // Additional conversion checks
    console.log("=== ADDITIONAL SCOPE CHECKS ===");
    console.log("Proof scope as string:", baseVcAndDiscloseProof.pubSignals[19].toString());
    console.log("Proof scope as BigInt:", BigInt(baseVcAndDiscloseProof.pubSignals[19]).toString());
    console.log("Do BigInt conversions match?:", BigInt(baseVcAndDiscloseProof.pubSignals[19]).toString() === BigInt(expectedScopeFromHash).toString());
    console.log("=== END ADDITIONAL SCOPE CHECKS ===");
    console.log("=== END SCOPE IN GENERATED PROOF ===");
  });

  beforeEach(async () => {
    vcAndDiscloseProof = structuredClone(baseVcAndDiscloseProof);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  describe("V2 Contracts Deployment", () => {
    // it("should have deployed IdentityVerificationHubImplV2 successfully", async () => {
    //   expect(deployedActors.hubImplV2.target).to.not.equal(ethers.ZeroAddress);
    // });

    // it("should have deployed TestSelfVerificationRoot successfully", async () => {
    //   expect(deployedActors.testSelfVerificationRoot.target).to.not.equal(ethers.ZeroAddress);
    // });

    // it("should have correct scope set in TestSelfVerificationRoot", async () => {
    //   const expectedScope = hashEndpointWithScope("example.com", "test-scope");
    //   const actualScope = await deployedActors.testSelfVerificationRoot.scope();
    //   expect(actualScope).to.equal(expectedScope);
    // });
  });

  describe("V2 Verification Configuration", () => {
    // it("should set verification config V2", async () => {
    //   const verificationConfigV2 = {
    //     olderThanEnabled: true,
    //     olderThan: "20",
    //     forbiddenCountriesEnabled: true,
    //     forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
    //     ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
    //   };

    //   const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

    //   await expect(deployedActors.hub.setVerificationConfigV2(verificationConfigV2))
    //     .to.emit(deployedActors.hub, "VerificationConfigV2Set")
    //     .withArgs(configId, Object.values(verificationConfigV2));
    // });

    // it("should check if verification config exists", async () => {
    //   const verificationConfigV2 = {
    //     olderThanEnabled: true,
    //     olderThan: "20",
    //     forbiddenCountriesEnabled: false,
    //     forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
    //     ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    //   };

    //   const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

    //   expect(await deployedActors.hub.verificationConfigV2Exists(configId)).to.be.false;

    //   await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);

    //   expect(await deployedActors.hub.verificationConfigV2Exists(configId)).to.be.true;
    // });
  });

  describe("Self Verification Root Functions", () => {
    // it("should allow scope changes", async () => {
    //   const newScope = hashEndpointWithScope("example.com", "new-scope");

    //   await expect(deployedActors.testSelfVerificationRoot.setScope(newScope))
    //     .to.emit(deployedActors.testSelfVerificationRoot, "ScopeUpdated")
    //     .withArgs(newScope);

    //   expect(await deployedActors.testSelfVerificationRoot.scope()).to.equal(newScope);
    // });

    // it("should reset test state", async () => {
    //   await deployedActors.testSelfVerificationRoot.resetTestState();

    //   expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.false;
    //   expect(await deployedActors.testSelfVerificationRoot.lastOutput()).to.equal("0x");
    //   expect(await deployedActors.testSelfVerificationRoot.lastUserData()).to.equal("0x");
    // });
  });

  describe("Mock Self Verification Flow", () => {
    // it("should demonstrate self verification interface", async () => {
    //   const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
    //   const mockProofData = ethers.solidityPacked(
    //     ["bytes32", "bytes"],
    //     [attestationId, "0x1234567890abcdef"]
    //   );

    //   const configId = ethers.keccak256(ethers.toUtf8Bytes("mock-config"));
    //   const destChainId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    //   const userIdentifier = ethers.zeroPadValue(ethers.toBeHex(12345), 32);
    //   const userData = ethers.toUtf8Bytes("test-user-data");

    //   const additionalData = ethers.solidityPacked(
    //     ["bytes32", "bytes32", "bytes32", "bytes"],
    //     [configId, destChainId, userIdentifier, userData]
    //   );

    //   await expect(
    //     deployedActors.testSelfVerificationRoot.verifySelfProof(mockProofData, additionalData)
    //   ).to.be.reverted;
    // });

    // it("should test onVerificationSuccess callback", async () => {
    //   const mockOutput = ethers.toUtf8Bytes("mock-verification-output");
    //   const mockUserData = ethers.toUtf8Bytes("mock-user-data");

    //   await expect(
    //     deployedActors.testSelfVerificationRoot.onVerificationSuccess(mockOutput, mockUserData)
    //   ).to.emit(deployedActors.testSelfVerificationRoot, "VerificationCompleted")
    //     .withArgs(mockOutput, mockUserData);

    //   expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.true;
    //   expect(await deployedActors.testSelfVerificationRoot.lastOutput()).to.equal(
    //     ethers.hexlify(mockOutput)
    //   );
    //   expect(await deployedActors.testSelfVerificationRoot.lastUserData()).to.equal(
    //     ethers.hexlify(mockUserData)
    //   );
    // });
  });

  describe("Complete V2 Verification Flow", () => {
    it("should complete full verification flow with proper proof encoding", async () => {
      // Debug: Check scopes at different stages
      console.log("=== SCOPE DEBUG START ===");

      // 1. Check the scope set in TestSelfVerificationRoot contract
      const actualScopeInContract = await deployedActors.testSelfVerificationRoot.scope();
      console.log("1. Scope in TestSelfVerificationRoot contract:", actualScopeInContract.toString());

      // 2. Check the scope used in deploymentV2.ts
      const expectedScope = hashEndpointWithScope("example.com", "test-scope");
      console.log("2. Expected scope from hashEndpointWithScope('example.com', 'test-scope'):", expectedScope);
      console.log("   Expected scope type:", typeof expectedScope);

      // 3. Check the scope used when generating the proof
      const proofScopeFromBaseProof = baseVcAndDiscloseProof.pubSignals[19]; // scopeIndex is 19 for E_PASSPORT
      console.log("3. Scope in generated proof (baseVcAndDiscloseProof.pubSignals[19]):", proofScopeFromBaseProof);
      console.log("   Proof scope type:", typeof proofScopeFromBaseProof);

      // 4. Convert hex proof scope to decimal for comparison
      const proofScopeDecimal = BigInt(proofScopeFromBaseProof).toString();
      console.log("4. Proof scope as decimal:", proofScopeDecimal);

      // 5. Try to match the exact formatting expected by Solidity
      const proofScopeAsNumber = BigInt(proofScopeFromBaseProof);
      const expectedScopeAsNumber = BigInt(expectedScope);
      console.log("5. Detailed comparison:");
      console.log("   Expected scope (BigInt):", expectedScopeAsNumber.toString());
      console.log("   Proof scope (BigInt):", proofScopeAsNumber.toString());
      console.log("   Are BigInts equal?:", expectedScopeAsNumber === proofScopeAsNumber);

      // 6. Check if the scopes match
      console.log("6. Do scopes match?");
      console.log("   Contract scope == Expected scope:", actualScopeInContract.toString() === expectedScope);
      console.log("   Proof scope == Expected scope:", proofScopeFromBaseProof === expectedScope);
      console.log("   Proof scope (decimal) == Expected scope:", proofScopeDecimal === expectedScope);
      console.log("   Contract scope == Proof scope:", actualScopeInContract.toString() === proofScopeFromBaseProof);
      console.log("   Contract scope == Proof scope (decimal):", actualScopeInContract.toString() === proofScopeDecimal);

      // 7. Additional debugging: check what exactly was passed to generateVcAndDiscloseProof in before()
      console.log("7. Trying to regenerate scope values:");
      const hashFromTest = hashEndpointWithScope("example.com", "test-scope");
      const bigIntFromHash = BigInt(hashFromTest);
      const stringFromBigInt = bigIntFromHash.toString();
      console.log("   hashEndpointWithScope result:", hashFromTest);
      console.log("   BigInt conversion:", bigIntFromHash.toString());
      console.log("   .toString() conversion:", stringFromBigInt);
      console.log("   Does this match proof scope?:", stringFromBigInt === proofScopeFromBaseProof);

      console.log("=== SCOPE DEBUG END ===");

      const verificationConfigV2 = {
        olderThanEnabled: true,
        olderThan: "20",
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
        ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
      };

      await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
      const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

      const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
      const user1Address = await deployedActors.user1.getAddress();
      const userData = ethers.toUtf8Bytes("test-user-data-for-verification");

      const additionalData = ethers.solidityPacked(
        ["bytes32", "bytes32", "bytes32", "bytes"],
        [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
      );

      const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);

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

      console.log("=== CONTRACT DEBUG ===");
      console.log("TestSelfVerificationRoot address:", await deployedActors.testSelfVerificationRoot.getAddress());
      console.log("Hub address:", await deployedActors.hub.getAddress());
      console.log("HubImplV2 address:", await deployedActors.hubImplV2.getAddress());

      // Check basic contract functionality
      try {
        const testScope = await deployedActors.testSelfVerificationRoot.scope();
        console.log("TestSelfVerificationRoot scope check passed:", testScope.toString());
      } catch (error: any) {
        console.log("TestSelfVerificationRoot scope check failed:", error.message);
      }

      console.log("ProofData preview (first 100 bytes):", ethers.hexlify(proofData.slice(0, 100)));
      console.log("AdditionalData preview (first 100 bytes):", ethers.hexlify(additionalData.slice(0, 100)));
      console.log("=== END CONTRACT DEBUG ===");

      console.log("Calling verifySelfProof...");

      // Listen for ScopeDebug event
      const identityVerificationHubV2 = await ethers.getContractAt("IdentityVerificationHubImplV2", await deployedActors.hub.getAddress());

      try {
        const tx = await deployedActors.testSelfVerificationRoot.verifySelfProof(
          proofData,
          additionalData
        );

        const receipt = await tx.wait();
        console.log("Transaction completed successfully!");

        // Look for ScopeDebug event in the receipt
        const scopeDebugEvent = receipt?.logs.find(log => {
          try {
            const parsed = identityVerificationHubV2.interface.parseLog(log);
            return parsed?.name === "ScopeDebug";
          } catch {
            return false;
          }
        });

        if (scopeDebugEvent) {
          const parsed = identityVerificationHubV2.interface.parseLog(scopeDebugEvent);
          console.log("=== SOLIDITY SCOPE DEBUG ===");
          console.log("   Header scope:", parsed?.args.headerScope.toString());
          console.log("   Proof scope:", parsed?.args.proofScope.toString());
          console.log("   Is match:", parsed?.args.isMatch);
          console.log("=== END SOLIDITY SCOPE DEBUG ===");
        }

        await expect(tx).to.emit(deployedActors.testSelfVerificationRoot, "VerificationCompleted");
      } catch (error: any) {
        console.log("=== ERROR DETAILS ===");
        console.log("Error message:", error.message);
        console.log("Error code:", error.code);
        console.log("Error data:", error.data);
        if (error.transaction) {
          console.log("Transaction data:", error.transaction.data);
        }
        console.log("=== END ERROR DETAILS ===");
        throw error;
      }

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

    // it("should fail verification with invalid scope", async () => {
    //   const wrongScope = hashEndpointWithScope("wrong.com", "wrong-scope");
    //   await deployedActors.testSelfVerificationRoot.setScope(wrongScope);

    //   const verificationConfigV2 = {
    //     olderThanEnabled: true,
    //     olderThan: "20",
    //     forbiddenCountriesEnabled: false,
    //     forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
    //     ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    //   };

    //   await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
    //   const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

    //   const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    //   const user1Address = await deployedActors.user1.getAddress();
    //   const userData = ethers.toUtf8Bytes("test-data");

    //   const additionalData = ethers.solidityPacked(
    //     ["bytes32", "bytes32", "bytes32", "bytes"],
    //     [configId, destChainId, ethers.zeroPadValue(user1Address, 32), userData]
    //   );

    //   const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
    //   const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
    //     ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
    //     [[
    //       vcAndDiscloseProof.a,
    //       vcAndDiscloseProof.b,
    //       vcAndDiscloseProof.c,
    //       vcAndDiscloseProof.pubSignals
    //     ]]
    //   );

    //   const proofData = ethers.solidityPacked(
    //     ["bytes32", "bytes"],
    //     [attestationId, encodedProof]
    //   );

    //   await expect(
    //     deployedActors.testSelfVerificationRoot.connect(deployedActors.user1).verifySelfProof(
    //       proofData,
    //       additionalData
    //     )
    //   ).to.be.reverted;
    // });

    // it("should fail verification with invalid user identifier", async () => {
    //   const verificationConfigV2 = {
    //     olderThanEnabled: true,
    //     olderThan: "20",
    //     forbiddenCountriesEnabled: false,
    //     forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
    //     ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
    //   };

    //   await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);
    //   const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

    //   const destChainId = ethers.zeroPadValue(ethers.toBeHex(31337), 32);
    //   const wrongAddress = await deployedActors.user2.getAddress();
    //   const userData = ethers.toUtf8Bytes("test-data");

    //   const additionalData = ethers.solidityPacked(
    //     ["bytes32", "bytes32", "bytes32", "bytes"],
    //     [configId, destChainId, ethers.zeroPadValue(wrongAddress, 32), userData]
    //   );

    //   const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
    //   const encodedProof = ethers.AbiCoder.defaultAbiCoder().encode(
    //     ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[] pubSignals)"],
    //     [[
    //       vcAndDiscloseProof.a,
    //       vcAndDiscloseProof.b,
    //       vcAndDiscloseProof.c,
    //       vcAndDiscloseProof.pubSignals
    //     ]]
    //   );

    //   const proofData = ethers.solidityPacked(
    //     ["bytes32", "bytes"],
    //     [attestationId, encodedProof]
    //   );

    //   await expect(
    //     deployedActors.testSelfVerificationRoot.connect(deployedActors.user1).verifySelfProof(
    //       proofData,
    //       additionalData
    //     )
    //   ).to.be.revertedWith("UserIdentifier hash mismatch");
    // });
  });
});
