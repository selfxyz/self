import { expect } from "chai";
import { ethers } from "hardhat";
import { generateRandomFieldElement } from "../utils/utils";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { generateDscProof, generateRegisterIdProof } from "../utils/generateProof";
import { DscVerifierId, RegisterVerifierId } from "@selfxyz/common/constants/constants";
import serialized_dsc_tree from "@selfxyz/common/pubkeys/serialized_dsc_tree.json";
import {
  CIRCUIT_CONSTANTS,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
} from "@selfxyz/common/constants/constants";
import { genMockIdDocAndInitDataParsing } from "@selfxyz/common/utils/passports/genMockIdDoc";

describe("ID Registration test", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let attestationIdBytes32: string;

  before(async () => {
    // Deploy contracts and setup initial state
    deployedActors = await deploySystemFixturesV2();
    attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);

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

  describe("DSC Commitment Registration", () => {
    let dscProof: any;
    let idCardData: any;

    before(async () => {
      // Generate DSC proof once for all tests in this describe block
      idCardData = genMockIdDocAndInitDataParsing({
        idType: "mock_id_card",
        dgHashAlgo: "sha256",
        eContentHashAlgo: "sha256",
        signatureType: "rsa_sha256_65537_2048",
        nationality: "USA",
        birthDate: "900101",
        expiryDate: "301231",
      });

      dscProof = await generateDscProof(idCardData);
      console.log("✅ DSC proof generated for DSC commitment tests");
    });

    it("should successfully register DSC key commitment", async () => {
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;
      const initialDscRoot = await deployedActors.registryId.getDscKeyCommitmentMerkleRoot();
      const initialTreeSize = await deployedActors.registryId.getDscKeyCommitmentTreeSize();

      // Register the DSC key commitment
      await expect(
        deployedActors.hub.registerDscKeyCommitment(attestationIdBytes32, dscCircuitVerifierId, dscProof),
      ).to.emit(deployedActors.registryId, "DscKeyCommitmentRegistered");

      // Verify DSC was added to tree
      const updatedDscRoot = await deployedActors.registryId.getDscKeyCommitmentMerkleRoot();
      const updatedTreeSize = await deployedActors.registryId.getDscKeyCommitmentTreeSize();

      expect(updatedDscRoot).to.not.equal(initialDscRoot);
      expect(updatedTreeSize).to.equal(initialTreeSize + 1n);

      // Verify the commitment is registered
      const isRegistered = await deployedActors.registryId.isRegisteredDscKeyCommitment(
        dscProof.pubSignals[CIRCUIT_CONSTANTS.DSC_TREE_LEAF_INDEX],
      );
      expect(isRegistered).to.be.true;
    });

    it("should fail with NoVerifierSet when using non-existent verifier ID", async () => {
      const nonExistentVerifierId = 999999; // Non-existent verifier ID

      await expect(
        deployedActors.hub.registerDscKeyCommitment(attestationIdBytes32, nonExistentVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with NoVerifierSet when using invalid attestation ID (no verifier configured)", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;

      await expect(
        deployedActors.hub.registerDscKeyCommitment(invalidAttestationId, dscCircuitVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with InvalidAttestationId when verifier exists but attestation ID is invalid", async () => {
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

    it("should fail with InvalidDscProof when providing invalid proof", async () => {
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
        deployedActors.hub.registerDscKeyCommitment(attestationIdBytes32, dscCircuitVerifierId, invalidDscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidDscProof");
    });

    it("should fail with InvalidCscaRoot when CSCA root doesn't match", async () => {
      const dscCircuitVerifierId = DscVerifierId.dsc_sha256_rsa_65537_4096;

      // Manipulate the CSCA root in the registry to make it invalid
      await deployedActors.registryId.updateCscaRoot(12345); // Invalid CSCA root

      await expect(
        deployedActors.hub.registerDscKeyCommitment(attestationIdBytes32, dscCircuitVerifierId, dscProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidCscaRoot");
    });
  });

  describe("Identity Commitment Registration", () => {
    let registerProof: any;
    let registerSecret: string;
    let idCardData: any;

    before(async () => {
      const dscKeys = JSON.parse(serialized_dsc_tree);
      for (let i = 0; i < dscKeys[0].length; i++) {
        await deployedActors.registryId.devAddDscKeyCommitment(BigInt(dscKeys[0][i]));
      }

      // Generate identity commitment proof
      idCardData = genMockIdDocAndInitDataParsing({
        idType: "mock_id_card",
        dgHashAlgo: "sha256",
        eContentHashAlgo: "sha256",
        signatureType: "rsa_sha256_65537_2048",
        nationality: "GBR",
        birthDate: "920315",
        expiryDate: "321231",
      });

      registerSecret = generateRandomFieldElement();
      registerProof = await generateRegisterIdProof(registerSecret, idCardData);
      console.log("✅ Identity commitment proof generated for identity tests");
    });

    it("should successfully register identity commitment", async () => {
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      // Register the identity commitment
      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, registerCircuitVerifierId, registerProof),
      ).to.emit(deployedActors.registryId, "CommitmentRegistered");

      // Verify the commitment is registered by checking the nullifier
      const isRegistered = await deployedActors.registryId.nullifiers(
        attestationIdBytes32,
        registerProof.pubSignals[CIRCUIT_CONSTANTS.REGISTER_NULLIFIER_INDEX],
      );
      expect(isRegistered).to.be.true;
    });

    it("should fail with NoVerifierSet when using non-existent register verifier ID", async () => {
      const nonExistentVerifierId = 999999; // Non-existent verifier ID

      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, nonExistentVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with NoVerifierSet when using invalid attestation ID for register (no verifier configured)", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      await expect(
        deployedActors.hub.registerCommitment(invalidAttestationId, registerCircuitVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "NoVerifierSet");
    });

    it("should fail with InvalidAttestationId when register verifier exists but attestation ID is invalid", async () => {
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

    it("should fail with InvalidRegisterProof when providing invalid register proof", async () => {
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
        deployedActors.hub.registerCommitment(attestationIdBytes32, registerCircuitVerifierId, invalidRegisterProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidRegisterProof");
    });

    it("should fail with InvalidDscCommitmentRoot when DSC commitment root doesn't match", async () => {
      const registerCircuitVerifierId = RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096;

      // Create a new registry snapshot to restore later
      const tempSnapshot = await ethers.provider.send("evm_snapshot", []);

      // Add an invalid DSC key commitment to change the root
      await deployedActors.registryId.devAddDscKeyCommitment(BigInt(999999));

      // The proof was generated with the original root, so it should fail
      await expect(
        deployedActors.hub.registerCommitment(attestationIdBytes32, registerCircuitVerifierId, registerProof),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidDscCommitmentRoot");

      // Restore the snapshot
      await ethers.provider.send("evm_revert", [tempSnapshot]);
    });
  });
});
