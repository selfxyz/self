import { expect } from "chai";
import { ethers } from "hardhat";
import { ATTESTATION_ID } from "../utils/constants";
import { generateVcAndDiscloseProof } from "../utils/generateProof";
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

    const expectedScopeFromHash = hashEndpointWithScope("example.com", "test-scope");
    const scopeAsBigInt = BigInt(expectedScopeFromHash);
    const scopeAsBigIntString = scopeAsBigInt.toString();

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

  // describe("V2 Verification Configuration", () => {
  //   it("should set verification config V2", async () => {
  //     const verificationConfigV2 = {
  //       olderThanEnabled: true,
  //       olderThan: "20",
  //       forbiddenCountriesEnabled: true,
  //       forbiddenCountriesListPacked: forbiddenCountriesListPacked as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
  //       ofacEnabled: [true, true, true] as [boolean, boolean, boolean],
  //     };

  //     const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

  //     await expect(deployedActors.hub.setVerificationConfigV2(verificationConfigV2))
  //       .to.emit(deployedActors.hub, "VerificationConfigV2Set")
  //       .withArgs(configId, Object.values(verificationConfigV2));
  //   });

  //   it("should check if verification config exists", async () => {
  //     const verificationConfigV2 = {
  //       olderThanEnabled: true,
  //       olderThan: "20",
  //       forbiddenCountriesEnabled: false,
  //       forbiddenCountriesListPacked: [0n, 0n, 0n, 0n] as [BigNumberish, BigNumberish, BigNumberish, BigNumberish],
  //       ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
  //     };

  //     const configId = await deployedActors.hub.generateConfigId(verificationConfigV2);

  //     expect(await deployedActors.hub.verificationConfigV2Exists(configId)).to.be.false;

  //     await deployedActors.hub.setVerificationConfigV2(verificationConfigV2);

  //     expect(await deployedActors.hub.verificationConfigV2Exists(configId)).to.be.true;
  //   });
  // });

  // describe("Self Verification Root Functions", () => {
  //   it("should allow scope changes", async () => {
  //     const newScope = hashEndpointWithScope("example.com", "new-scope");

  //     await expect(deployedActors.testSelfVerificationRoot.setScope(newScope))
  //       .to.emit(deployedActors.testSelfVerificationRoot, "ScopeUpdated")
  //       .withArgs(newScope);

  //     expect(await deployedActors.testSelfVerificationRoot.scope()).to.equal(newScope);
  //   });

  //   it("should reset test state", async () => {
  //     await deployedActors.testSelfVerificationRoot.resetTestState();

  //     expect(await deployedActors.testSelfVerificationRoot.verificationSuccessful()).to.be.false;
  //     expect(await deployedActors.testSelfVerificationRoot.lastOutput()).to.equal("0x");
  //     expect(await deployedActors.testSelfVerificationRoot.lastUserData()).to.equal("0x");
  //   });

  //   it("should only allow hub contract to call onVerificationSuccess", async () => {
  //     const mockOutput = ethers.toUtf8Bytes("mock-verification-output");
  //     const mockUserData = ethers.toUtf8Bytes("mock-user-data");

  //     // Should fail when called by non-hub address using testOnVerificationSuccess method
  //     await expect(
  //       (deployedActors.testSelfVerificationRoot as any).testOnVerificationSuccess(mockOutput, mockUserData)
  //     ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "UnauthorizedCaller");

  //     // Should also fail when called directly by any other address
  //     await expect(
  //       (deployedActors.testSelfVerificationRoot.connect(deployedActors.user1) as any).testOnVerificationSuccess(mockOutput, mockUserData)
  //     ).to.be.revertedWithCustomError(deployedActors.testSelfVerificationRoot, "UnauthorizedCaller");
  //   });
  // });

  // describe("Mock Self Verification Flow", () => {
  //   it("should demonstrate self verification interface", async () => {
  //     const attestationId = ethers.zeroPadValue(ethers.toBeHex(BigInt(ATTESTATION_ID.E_PASSPORT)), 32);
  //     const mockProofData = ethers.solidityPacked(
  //       ["bytes32", "bytes"],
  //       [attestationId, "0x1234567890abcdef"]
  //     );

  //     const configId = ethers.keccak256(ethers.toUtf8Bytes("mock-config"));
  //     const destChainId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
  //     const userIdentifier = ethers.zeroPadValue(ethers.toBeHex(12345), 32);
  //     const userData = ethers.toUtf8Bytes("test-user-data");

  //     const additionalData = ethers.solidityPacked(
  //       ["bytes32", "bytes32", "bytes32", "bytes"],
  //       [configId, destChainId, userIdentifier, userData]
  //     );

  //     await expect(
  //       deployedActors.testSelfVerificationRoot.verifySelfProof(mockProofData, additionalData)
  //     ).to.be.reverted;
  //   });
  // });

  describe("Complete V2 Verification Flow", () => {
    it("should complete full verification flow with proper proof encoding", async () => {
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

      const tx = await deployedActors.testSelfVerificationRoot.verifySelfProof(
        proofData,
        additionalData
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
    //     ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
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
    //     ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[21] pubSignals)"],
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
