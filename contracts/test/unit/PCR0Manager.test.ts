import { expect } from "chai";
import { ethers } from "hardhat";
import { PCR0Manager } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PCR0Manager", function () {
  let pcr0Manager: PCR0Manager;
  let owner: SignerWithAddress;
  let other: SignerWithAddress;

  // Sample PCR0 value for testing
  // addPCR0/removePCR0 expect 32 bytes (GCP image hash)
  const samplePCR0_32bytes = "0x" + "ab".repeat(32);
  // isPCR0Set expects 48 bytes (16 zero bytes prefix + 32 byte hash, for mobile compatibility)
  const samplePCR0_48bytes = "0x" + "00".repeat(16) + "ab".repeat(32);
  // Invalid sizes for testing error cases
  const invalidPCR0_for_add = "0x" + "00".repeat(48); // 48 bytes - invalid for add/remove
  const invalidPCR0_for_check = "0x" + "00".repeat(32); // 32 bytes - invalid for isPCR0Set

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();

    const PCR0Manager = await ethers.getContractFactory("PCR0Manager");
    pcr0Manager = await PCR0Manager.deploy();
  });

  describe("addPCR0", function () {
    it("should allow owner to add PCR0 value", async function () {
      await expect(pcr0Manager.addPCR0(samplePCR0_32bytes)).to.emit(pcr0Manager, "PCR0Added");

      expect(await pcr0Manager.isPCR0Set(samplePCR0_48bytes)).to.be.true;
    });

    it("should not allow non-owner to add PCR0 value", async function () {
      await expect(pcr0Manager.connect(other).addPCR0(samplePCR0_32bytes))
        .to.be.revertedWithCustomError(pcr0Manager, "AccessControlUnauthorizedAccount")
        .withArgs(other.address, await pcr0Manager.SECURITY_ROLE());
    });

    it("should not allow adding PCR0 with invalid size", async function () {
      await expect(pcr0Manager.addPCR0(invalidPCR0_for_add)).to.be.revertedWith("PCR0 must be 32 bytes");
    });

    it("should not allow adding duplicate PCR0", async function () {
      await pcr0Manager.addPCR0(samplePCR0_32bytes);
      await expect(pcr0Manager.addPCR0(samplePCR0_32bytes)).to.be.revertedWith("PCR0 already set");
    });
  });

  describe("removePCR0", function () {
    beforeEach(async function () {
      await pcr0Manager.addPCR0(samplePCR0_32bytes);
    });

    it("should allow owner to remove PCR0 value", async function () {
      await expect(pcr0Manager.removePCR0(samplePCR0_32bytes)).to.emit(pcr0Manager, "PCR0Removed");

      expect(await pcr0Manager.isPCR0Set(samplePCR0_48bytes)).to.be.false;
    });

    // This is not actually needed, just for increase the coverage of the test code
    it("should not allow remove PCR0 with invalid size", async function () {
      await expect(pcr0Manager.removePCR0(invalidPCR0_for_add)).to.be.revertedWith("PCR0 must be 32 bytes");
    });

    it("should not allow non-owner to remove PCR0 value", async function () {
      await expect(pcr0Manager.connect(other).removePCR0(samplePCR0_32bytes))
        .to.be.revertedWithCustomError(pcr0Manager, "AccessControlUnauthorizedAccount")
        .withArgs(other.address, await pcr0Manager.SECURITY_ROLE());
    });

    it("should not allow removing non-existent PCR0", async function () {
      const otherPCR0 = "0x" + "11".repeat(32);
      await expect(pcr0Manager.removePCR0(otherPCR0)).to.be.revertedWith("PCR0 not set");
    });
  });

  describe("isPCR0Set", function () {
    it("should correctly return PCR0 status", async function () {
      expect(await pcr0Manager.isPCR0Set(samplePCR0_48bytes)).to.be.false;

      await pcr0Manager.addPCR0(samplePCR0_32bytes);
      expect(await pcr0Manager.isPCR0Set(samplePCR0_48bytes)).to.be.true;

      await pcr0Manager.removePCR0(samplePCR0_32bytes);
      expect(await pcr0Manager.isPCR0Set(samplePCR0_48bytes)).to.be.false;
    });

    it("should not allow checking PCR0 with invalid size", async function () {
      await expect(pcr0Manager.isPCR0Set(invalidPCR0_for_check)).to.be.revertedWith("PCR0 must be 48 bytes");
    });
  });
});
