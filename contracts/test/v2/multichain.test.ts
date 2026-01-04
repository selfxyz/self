import { expect } from "chai";
import { ethers } from "hardhat";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import type { DeployedActorsV2 } from "../utils/types";

describe("Hub Multichain Configuration Tests", function () {
  this.timeout(0);

  let deployedActors: DeployedActorsV2;
  let snapshotId: string;

  const BASE_CHAIN_ID = 8453;
  const GNOSIS_CHAIN_ID = 100;
  const OPTIMISM_CHAIN_ID = 10;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
    console.log("✅ System deployment completed");
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Bridge Endpoint Configuration", () => {
    it("should allow admin to set bridge endpoint", async () => {
      const bridgeEndpoint = "0x1234567890123456789012345678901234567890";
      await expect(deployedActors.hub.setBridgeEndpoint(bridgeEndpoint)).to.not.be.reverted;
    });

    it("should reject non-admin setting bridge endpoint", async () => {
      const nonAdminHub = deployedActors.hub.connect(deployedActors.user1);
      const bridgeEndpoint = "0x1234567890123456789012345678901234567890";
      await expect(nonAdminHub.setBridgeEndpoint(bridgeEndpoint)).to.be.reverted;
    });
  });

  describe("Destination Hub Configuration", () => {
    it("should allow admin to set destination hub for Base", async () => {
      const hubAddress = ethers.zeroPadValue("0x1111111111111111111111111111111111111111", 32);
      await expect(deployedActors.hub.setDestinationHub(BASE_CHAIN_ID, hubAddress)).to.not.be
        .reverted;
    });

    it("should allow admin to set destination hub for Gnosis", async () => {
      const hubAddress = ethers.zeroPadValue("0x2222222222222222222222222222222222222222", 32);
      await expect(deployedActors.hub.setDestinationHub(GNOSIS_CHAIN_ID, hubAddress)).to.not.be
        .reverted;
    });

    it("should allow admin to set destination hub for Optimism", async () => {
      const hubAddress = ethers.zeroPadValue("0x3333333333333333333333333333333333333333", 32);
      await expect(deployedActors.hub.setDestinationHub(OPTIMISM_CHAIN_ID, hubAddress)).to.not.be
        .reverted;
    });

    it("should reject non-admin setting destination hub", async () => {
      const nonAdminHub = deployedActors.hub.connect(deployedActors.user1);
      const hubAddress = ethers.zeroPadValue("0x1111111111111111111111111111111111111111", 32);
      await expect(nonAdminHub.setDestinationHub(BASE_CHAIN_ID, hubAddress)).to.be.reverted;
    });
  });

  // Batch Destination Hub Configuration tests removed
  // batchSetDestinationHubs() was removed to save contract size
  // Use setDestinationHub() multiple times instead

  describe("Backwards Compatibility", () => {
    it("should maintain existing registry functionality", async () => {
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(1n), 32);
      const registryAddress = await deployedActors.hub.registry(attestationIdBytes32);
      expect(registryAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should maintain existing disclose verifier functionality", async () => {
      const attestationIdBytes32 = ethers.zeroPadValue(ethers.toBeHex(1n), 32);
      const verifierAddress = await deployedActors.hub.discloseVerifier(attestationIdBytes32);
      expect(verifierAddress).to.not.equal(ethers.ZeroAddress);
    });
  });
});



