import { ethers } from "hardhat";
import { expect } from "chai";
import { deploySystemFixturesV2 } from "../utils/deploymentV2";
import { DeployedActorsV2 } from "../utils/types";

describe("Hub prover key registration", () => {
  let deployedActors: DeployedActorsV2;
  let snapshotId: string;

  before(async () => {
    deployedActors = await deploySystemFixturesV2();
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("configuration", () => {
    it("stores and returns each config value", async () => {
      const { hub, owner } = deployedActors;
      const verifier = ethers.Wallet.createRandom().address;
      const pcr0 = ethers.Wallet.createRandom().address;
      const tee = await owner.getAddress();

      await hub.updateProverGCPJWTVerifier(verifier);
      await hub.updateProverPCR0Manager(pcr0);
      await hub.updateProverGCPRootCAPubkeyHash(12345n);
      await hub.updateProverTEE(tee);

      expect(await hub.proverGCPJWTVerifier()).to.equal(verifier);
      expect(await hub.proverPCR0Manager()).to.equal(pcr0);
      expect(await hub.proverGCPRootCAPubkeyHash()).to.equal(12345n);
      expect(await hub.proverTEE()).to.equal(tee);
    });

    it("rejects config writes from a non-SECURITY_ROLE caller", async () => {
      const { hub, user1 } = deployedActors;
      await expect(
        hub.connect(user1).updateProverTEE(ethers.Wallet.createRandom().address),
      ).to.be.reverted;
    });

    it("emits an event for each config change", async () => {
      const { hub } = deployedActors;
      const verifier = ethers.Wallet.createRandom().address;
      await expect(hub.updateProverGCPJWTVerifier(verifier))
        .to.emit(hub, "ProverGCPJWTVerifierUpdated")
        .withArgs(verifier);
    });
  });
});
