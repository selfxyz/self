import { expect } from "chai";
import { ethers } from "hardhat";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";
import { DscVerifierId, RegisterVerifierId } from "@selfxyz/common/constants/constants";
import { ID_CARD_ATTESTATION_ID, PASSPORT_ATTESTATION_ID } from "@selfxyz/common/constants/constants";

describe("Hub Other Functions Test", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let snapshotId: string;
  let attestationIdBytes32: string;
  let ePassportAttestationIdBytes32: string;

  before(async () => {
    // Deploy contracts and setup initial state
    deployedActors = await deploySystemFixturesV2();
    attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(ID_CARD_ATTESTATION_ID)), 32);
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

  describe("Batch Update Functions Error Tests", () => {
    it("should fail with LengthMismatch when arrays have different lengths in batchUpdateRegisterCircuitVerifiers", async () => {
      const attestationIds = [attestationIdBytes32, ePassportAttestationIdBytes32];
      const typeIds = [1]; // Different length
      const verifierAddresses = [ethers.ZeroAddress, ethers.ZeroAddress];

      await expect(
        deployedActors.hub.batchUpdateRegisterCircuitVerifiers(attestationIds, typeIds, verifierAddresses),
      ).to.be.revertedWithCustomError(deployedActors.hub, "LengthMismatch");
    });

    it("should fail with LengthMismatch when arrays have different lengths in batchUpdateDscCircuitVerifiers", async () => {
      const attestationIds = [attestationIdBytes32];
      const typeIds = [1, 2]; // Different length
      const verifierAddresses = [ethers.ZeroAddress];

      await expect(
        deployedActors.hub.batchUpdateDscCircuitVerifiers(attestationIds, typeIds, verifierAddresses),
      ).to.be.revertedWithCustomError(deployedActors.hub, "LengthMismatch");
    });

    it("should successfully batch update register circuit verifiers with matching array lengths", async () => {
      const attestationIds = [attestationIdBytes32, ePassportAttestationIdBytes32];
      const typeIds = [1, 2];
      const verifierAddresses = [ethers.ZeroAddress, ethers.ZeroAddress];

      await expect(deployedActors.hub.batchUpdateRegisterCircuitVerifiers(attestationIds, typeIds, verifierAddresses))
        .to.not.be.reverted;
    });

    it("should successfully batch update DSC circuit verifiers with matching array lengths", async () => {
      const attestationIds = [attestationIdBytes32, ePassportAttestationIdBytes32];
      const typeIds = [1, 2];
      const verifierAddresses = [ethers.ZeroAddress, ethers.ZeroAddress];

      await expect(deployedActors.hub.batchUpdateDscCircuitVerifiers(attestationIds, typeIds, verifierAddresses)).to.not
        .be.reverted;
    });
  });

  describe("Access Control Tests", () => {
    it("should fail when non-owner tries to call onlyOwner functions", async () => {
      const nonOwnerHub = deployedActors.hub.connect(deployedActors.user1);

      await expect(nonOwnerHub.updateRegistry(attestationIdBytes32, ethers.ZeroAddress)).to.be.reverted; // Should revert due to onlyOwner modifier

      await expect(nonOwnerHub.updateVcAndDiscloseCircuit(attestationIdBytes32, ethers.ZeroAddress)).to.be.reverted; // Should revert due to onlyOwner modifier

      await expect(nonOwnerHub.updateRegisterCircuitVerifier(attestationIdBytes32, 1, ethers.ZeroAddress)).to.be
        .reverted; // Should revert due to onlyOwner modifier

      await expect(nonOwnerHub.updateDscVerifier(attestationIdBytes32, 1, ethers.ZeroAddress)).to.be.reverted; // Should revert due to onlyOwner modifier
    });
  });

  describe("View Functions Tests", () => {
    it("should return correct registry address", async () => {
      const registryAddress = await deployedActors.hub.registry(attestationIdBytes32);
      expect(registryAddress).to.equal(await deployedActors.registryId.getAddress());
    });

    it("should return correct disclose verifier address", async () => {
      const discloseVerifierAddress = await deployedActors.hub.discloseVerifier(attestationIdBytes32);
      expect(discloseVerifierAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should return correct register circuit verifier address", async () => {
      const registerVerifierAddress = await deployedActors.hub.registerCircuitVerifiers(
        attestationIdBytes32,
        RegisterVerifierId.register_sha256_sha256_sha256_rsa_65537_4096,
      );
      expect(registerVerifierAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should return correct DSC circuit verifier address", async () => {
      const dscVerifierAddress = await deployedActors.hub.dscCircuitVerifiers(
        attestationIdBytes32,
        DscVerifierId.dsc_sha256_rsa_65537_4096,
      );
      expect(dscVerifierAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should return correct identity commitment merkle root", async () => {
      const merkleRoot = await deployedActors.hub.getIdentityCommitmentMerkleRoot(attestationIdBytes32);
      expect(merkleRoot).to.be.a("bigint");
    });

    it("should fail getIdentityCommitmentMerkleRoot with InvalidAttestationId", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);

      await expect(
        deployedActors.hub.getIdentityCommitmentMerkleRoot(invalidAttestationId),
      ).to.be.revertedWithCustomError(deployedActors.hub, "InvalidAttestationId");
    });

    it("should fail rootTimestamp with InvalidAttestationId", async () => {
      const invalidAttestationId = ethers.zeroPadValue(ethers.toBeHex(999), 32);

      await expect(deployedActors.hub.rootTimestamp(invalidAttestationId, 123)).to.be.revertedWithCustomError(
        deployedActors.hub,
        "InvalidAttestationId",
      );
    });
  });

  describe("Verification Config V2 Tests", () => {
    it("should successfully set and retrieve verification config V2", async () => {
      const config = {
        olderThanEnabled: true,
        olderThan: 18,
        forbiddenCountriesEnabled: true,
        forbiddenCountriesListPacked: [840, 156, 0, 0] as [number, number, number, number], // USA, China
        ofacEnabled: [true, false, false] as [boolean, boolean, boolean],
      };

      const configId = await deployedActors.hub.setVerificationConfigV2.staticCall(config);
      await expect(deployedActors.hub.setVerificationConfigV2(config))
        .to.emit(deployedActors.hub, "VerificationConfigV2Set")
        .withArgs(configId, [
          config.olderThanEnabled,
          config.olderThan,
          config.forbiddenCountriesEnabled,
          config.forbiddenCountriesListPacked,
          config.ofacEnabled,
        ]);

      const exists = await deployedActors.hub.verificationConfigV2Exists(configId);
      expect(exists).to.be.true;
    });

    it("should generate consistent config IDs for the same config", async () => {
      const config = {
        olderThanEnabled: false,
        olderThan: 21,
        forbiddenCountriesEnabled: false,
        forbiddenCountriesListPacked: [392, 0, 0, 0] as [number, number, number, number], // Japan
        ofacEnabled: [false, false, false] as [boolean, boolean, boolean],
      };

      const generatedId = await deployedActors.hub.generateConfigId(config);
      const staticCallId = await deployedActors.hub.setVerificationConfigV2.staticCall(config);

      expect(generatedId).to.equal(staticCallId);
    });

    it("should return false for non-existent config", async () => {
      const nonExistentConfigId = ethers.randomBytes(32);
      const exists = await deployedActors.hub.verificationConfigV2Exists(nonExistentConfigId);
      expect(exists).to.be.false;
    });
  });
});
