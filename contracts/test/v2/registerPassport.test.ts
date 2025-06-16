import { expect } from "chai";
import { ethers } from "hardhat";
import { generateRandomFieldElement } from "../utils/utils";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { generateDscProof, generateRegisterProof } from "../utils/generateProof";
import { DscVerifierId, RegisterVerifierId } from "@selfxyz/common/constants/constants";
import serialized_dsc_tree from "@selfxyz/common/pubkeys/serialized_dsc_tree.json";
import { CIRCUIT_CONSTANTS, PASSPORT_ATTESTATION_ID } from "@selfxyz/common/constants/constants";
import { genMockIdDocAndInitDataParsing } from "@selfxyz/common/utils/passports/genMockIdDoc";

describe("Passport Registration test", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let ePassportAttestationIdBytes32: string;

  before(async () => {
    // Deploy contracts and setup initial state
    deployedActors = await deploySystemFixturesV2();
    ePassportAttestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(PASSPORT_ATTESTATION_ID)), 32);

    console.log("🎉 System deployment and initial setup completed!");
  });

  beforeEach(async () => {
    // Take snapshot before each test
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    // Revert to snapshot after each test
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("DSC Commitment Registration for Passport", () => {
    let dscProof: any;
    let passportData: any;

    before(async () => {
      // Generate DSC proof once for all tests in this describe block
      passportData = genMockIdDocAndInitDataParsing({
        idType: "mock_passport",
        dgHashAlgo: "sha256",
        eContentHashAlgo: "sha256",
        signatureType: "rsa_sha256_65537_2048",
        nationality: "USA",
        birthDate: "900101",
        expiryDate: "301231",
      });

      dscProof = await generateDscProof(passportData);
      console.log("✅ DSC proof generated for passport DSC commitment tests");
    });

    it("should successfully register DSC key commitment for passport", async () => {
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;
      const initialDscRoot = await deployedActors.registry.getDscKeyCommitmentMerkleRoot();
      const initialTreeSize = await deployedActors.registry.getDscKeyCommitmentTreeSize();

      // Register the DSC key commitment
      await expect(
        deployedActors.hub.registerDscKeyCommitment(ePassportAttestationIdBytes32, dscCircuitVerifierId, dscProof),
      ).to.emit(deployedActors.registry, "DscKeyCommitmentRegistered");

      // Verify DSC was added to tree
      const updatedDscRoot = await deployedActors.registry.getDscKeyCommitmentMerkleRoot();
      const updatedTreeSize = await deployedActors.registry.getDscKeyCommitmentTreeSize();

      expect(updatedDscRoot).to.not.equal(initialDscRoot);
      expect(updatedTreeSize).to.equal(initialTreeSize + 1n);

      // Verify the commitment is registered
      const isRegistered = await deployedActors.registry.isRegisteredDscKeyCommitment(
        dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX],
      );
      expect(isRegistered).to.be.true;
    });

    it("should fail with NoVerifierSet when using non-existent verifier ID for passport", async () => {
      const nonExistentVerifierId = 999999; // Non-existent verifier ID

      await expect(
        deployedActors.hub.registerDscKeyCommitment(ePassportAttestationIdBytes32, nonExistentVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with NoVerifierSet when using invalid attestation ID for passport (no verifier configured)", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;

      await expect(
        deployedActors.hub.registerDscKeyCommitment(invalidAttestationId, dscCircuitVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with InvalidAttestationId when verifier exists but attestation ID is invalid for passport", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;

      // First, set up a verifier for the invalid attestation ID
      await deployedActors.hub.updateDscVerifier(
        invalidAttestationId,
        dscCircuitVerifierId,
        await deployedActors.dsc.getAddress(),
      );

      // Now the call should fail with InvalidAttestationId since verifier exists but attestation ID is not valid
      await expect(
        deployedActors.hub.registerDscKeyCommitment(invalidAttestationId, dscCircuitVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidAttestationId");
    });

    it("should fail with InvalidDscProof when providing invalid proof for passport", async () => {
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;

      // Create invalid proof by modifying the original
      const invalidDscProof = {
        ...dscProof,
        a: ["0x1", "0x2"], // Invalid proof values
        b: [
          ["0x1", "0x2"],
          ["0x3", "0x4"],
        ],
        c: ["0x1", "0x2"],
      };

      await expect(
        deployedActors.hub.registerDscKeyCommitment(
          ePassportAttestationIdBytes32,
          dscCircuitVerifierId,
          invalidDscProof,
        ),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidDscProof");
    });

    it("should fail with InvalidCscaRoot when CSCA root doesn't match for passport", async () => {
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;

      // Manipulate the CSCA root in the registry to make it invalid
      await deployedActors.registry.updateCscaRoot(12345); // Invalid CSCA root

      await expect(
        deployedActors.hub.registerDscKeyCommitment(ePassportAttestationIdBytes32, dscCircuitVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidCscaRoot");
    });
  });

  describe("Passport Identity Commitment Registration", () => {
    let registerProof: any;
    let registerSecret: string;
    let passportData: any;

    before(async () => {
      const dscKeys = JSON.parse(serialized_dsc_tree);
      for (let i = 0; i < dscKeys[0].length; i++) {
        await deployedActors.registry.devAddDscKeyCommitment(BigInt(dscKeys[0][i]));
      }

      // Generate passport identity commitment proof using passport-specific function
      passportData = genMockIdDocAndInitDataParsing({
        idType: "mock_passport",
        dgHashAlgo: "sha256",
        eContentHashAlgo: "sha256",
        signatureType: "rsa_sha256_65537_2048",
        nationality: "GBR",
        birthDate: "920315",
        expiryDate: "321231",
      });

      registerSecret = generateRandomFieldElement();
      registerProof = await generateRegisterProof(registerSecret, passportData);
      console.log("✅ Passport identity commitment proof generated for passport identity tests");
    });

    it("should successfully register passport identity commitment", async () => {
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      // Register the passport identity commitment
      await expect(
        deployedActors.hub.registerCommitment(ePassportAttestationIdBytes32, registerCircuitVerifierId, registerProof),
      ).to.emit(deployedActors.registry, "CommitmentRegistered");

      // Verify the commitment is registered by checking the nullifier
      const isRegistered = await deployedActors.registry.nullifiers(
        ePassportAttestationIdBytes32,
        registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_NULLIFIER_INDEX],
      );
      expect(isRegistered).to.be.true;
    });

    it("should fail with NoVerifierSet when using non-existent passport register verifier ID", async () => {
      const nonExistentVerifierId = 999999; // Non-existent verifier ID

      await expect(
        deployedActors.hub.registerCommitment(ePassportAttestationIdBytes32, nonExistentVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with NoVerifierSet when using invalid attestation ID for passport register (no verifier configured)", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      await expect(
        deployedActors.hub.registerCommitment(invalidAttestationId, registerCircuitVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with InvalidAttestationId when passport register verifier exists but attestation ID is invalid", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      // First, set up a verifier for the invalid attestation ID
      await deployedActors.hub.updateRegisterCircuitVerifier(
        invalidAttestationId,
        registerCircuitVerifierId,
        await deployedActors.register.getAddress(),
      );

      // Now the call should fail with InvalidAttestationId since verifier exists but attestation ID is not valid
      await expect(
        deployedActors.hub.registerCommitment(invalidAttestationId, registerCircuitVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidAttestationId");
    });

    it("should fail with InvalidRegisterProof when providing invalid passport register proof", async () => {
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      // Create invalid proof by modifying the original
      const invalidRegisterProof = {
        ...registerProof,
        a: ["0x1", "0x2"], // Invalid proof values
        b: [
          ["0x1", "0x2"],
          ["0x3", "0x4"],
        ],
        c: ["0x1", "0x2"],
      };

      await expect(
        deployedActors.hub.registerCommitment(
          ePassportAttestationIdBytes32,
          registerCircuitVerifierId,
          invalidRegisterProof,
        ),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidRegisterProof");
    });

    it("should fail with InvalidDscCommitmentRoot when DSC commitment root doesn't match for passport", async () => {
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      // Create a new registry snapshot to restore later
      const tempSnapshot = await ethers.provider.send("evm_snapshot", []);

      // Add an invalid DSC key commitment to change the root
      await deployedActors.registry.devAddDscKeyCommitment(BigInt(999999));

      // The proof was generated with the original root, so it should fail
      await expect(
        deployedActors.hub.registerCommitment(ePassportAttestationIdBytes32, registerCircuitVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidDscCommitmentRoot");

      // Restore the snapshot
      await ethers.provider.send("evm_revert", [tempSnapshot]);
    });
  });
});
