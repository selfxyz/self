import { expect } from "chai";
import { ethers } from "hardhat";
import { PCR0Manager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PCR0Manager", function () {
  let pcr0Manager: PCR0Manager;
  let owner: SignerWithAddress;
  let other: SignerWithAddress;
  
  // Sample PCR0 value for testing (48 bytes)
  const samplePCR0 = "0x" + "00".repeat(48);
  const invalidPCR0 = "0x" + "00".repeat(32); // 32 bytes (invalid size)

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    
    const PCR0Manager = await ethers.getContractFactory("PCR0Manager");
    pcr0Manager = await PCR0Manager.deploy();
  });

  describe("addPCR0", function () {
    it("should allow owner to add PCR0 value", async function () {
      await expect(pcr0Manager.addPCR0(samplePCR0))
        .to.emit(pcr0Manager, "PCR0Added");
      
      expect(await pcr0Manager.isPCR0Set(samplePCR0)).to.be.true;
    });

    it("should allow owner to add PCR0 value", async function () {
        await expect(pcr0Manager.addPCR0(samplePCR0))
          .to.emit(pcr0Manager, "PCR0Added");
        
        expect(await pcr0Manager.isPCR0Set(samplePCR0)).to.be.true;
      });
  
    it("should not allow non-owner to add PCR0 value", async function () {
    await expect(pcr0Manager.connect(other).addPCR0(samplePCR0))
        .to.be.revertedWithCustomError(pcr0Manager, "OwnableUnauthorizedAccount")
        .withArgs(other.address);
    });

    it("should not allow adding PCR0 with invalid size", async function () {
      await expect(pcr0Manager.addPCR0(invalidPCR0))
        .to.be.revertedWith("PCR0 must be 48 bytes");
    });

    it("should not allow adding duplicate PCR0", async function () {
      await pcr0Manager.addPCR0(samplePCR0);
      await expect(pcr0Manager.addPCR0(samplePCR0))
        .to.be.revertedWith("PCR0 already set");
    });
  });

  describe("removePCR0", function () {
    beforeEach(async function () {
      await pcr0Manager.addPCR0(samplePCR0);
    });

    it("should allow owner to remove PCR0 value", async function () {
      await expect(pcr0Manager.removePCR0(samplePCR0))
        .to.emit(pcr0Manager, "PCR0Removed");
      
      expect(await pcr0Manager.isPCR0Set(samplePCR0)).to.be.false;
    });

    // This is not actually needed, just for increase the coverage of the test code
    it("should not allow remove PCR0 with invalid size", async function () {
        await expect(pcr0Manager.removePCR0(invalidPCR0))
          .to.be.revertedWith("PCR0 must be 48 bytes");
      });

    it("should not allow non-owner to remove PCR0 value", async function () {
        await expect(pcr0Manager.connect(other).removePCR0(samplePCR0))
          .to.be.revertedWithCustomError(pcr0Manager, "OwnableUnauthorizedAccount")
          .withArgs(other.address);
      });

    it("should not allow removing non-existent PCR0", async function () {
      const otherPCR0 = "0x" + "11".repeat(48);
      await expect(pcr0Manager.removePCR0(otherPCR0))
        .to.be.revertedWith("PCR0 not set");
    });
  });

  describe("isPCR0Set", function () {
    it("should correctly return PCR0 status", async function () {
      expect(await pcr0Manager.isPCR0Set(samplePCR0)).to.be.false;
      
      await pcr0Manager.addPCR0(samplePCR0);
      expect(await pcr0Manager.isPCR0Set(samplePCR0)).to.be.true;
      
      await pcr0Manager.removePCR0(samplePCR0);
      expect(await pcr0Manager.isPCR0Set(samplePCR0)).to.be.false;
    });

    it("should not allow checking PCR0 with invalid size", async function () {
      await expect(pcr0Manager.isPCR0Set(invalidPCR0))
        .to.be.revertedWith("PCR0 must be 48 bytes");
    });
  });
});