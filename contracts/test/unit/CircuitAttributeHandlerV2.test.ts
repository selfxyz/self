import { expect } from "chai";
import { ethers } from "hardhat";
import { TestCircuitAttributeHandlerV2 } from "../../typechain-types";

describe("CircuitAttributeHandlerV2", function () {
  let testHandler: TestCircuitAttributeHandlerV2;

  const E_PASSPORT = ethers.zeroPadValue("0x01", 32);
  const EU_ID_CARD = ethers.zeroPadValue("0x02", 32);

  before(async function () {
    const TestHandlerFactory = await ethers.getContractFactory("TestCircuitAttributeHandlerV2");
    testHandler = await TestHandlerFactory.deploy();
    await testHandler.waitForDeployment();
  });

  // Standard ICAO sample: P<UTOERIKSSON<<ANNA<MARIA + L898902C36UTO7408122F1204159ZE184226B<<<<<10
  // Nationality at positions 54-56 = "UTO", issuing state at 2-4 = "UTO"
  const standardPassportMrz = ethers.toUtf8Bytes(
    "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" + "L898902C36UTO7408122F1204159ZE184226B<<<<<1018",
  );
  const standardMRZ = new Uint8Array([...standardPassportMrz, 1, 1, 1]);

  // German passport (TD3): 2 lines of 44 chars each
  // Line 1 pos 2-4 = "D<<" (issuing state), Line 2 pos 10-12 = "D<<" (nationality)
  // Absolute: issuing state at 2-4, nationality at 54-56
  const germanPassportLine1 = "P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<"; // 44 chars
  const germanPassportLine2 = "C01X00T478D<<6408125F2702283<<<<<<<<<<<<<<04"; // 44 chars
  const germanPassportMrz = ethers.toUtf8Bytes(germanPassportLine1 + germanPassportLine2);
  const germanPassportMRZ = new Uint8Array([...germanPassportMrz, 1, 1, 1]);

  // German ID card (TD1): 3 lines of 30 chars each = 90 chars
  // Line 1 pos 2-4 = "D<<" (issuing state)
  // Line 2 pos 15-17 = "D<<" (nationality) → absolute pos 45-47
  const germanIdLine1 = "IDD<<C01X00T478<<<<<<<<<<<<<<<"; // 30 chars
  const germanIdLine2 = "6408125F2702287D<<<<<<<<<<<0<<"; // 30 chars, nationality at [15:18]="D<<"
  const germanIdLine3 = "MUSTERMANN<<ERIKA<<<<<<<<<<<<<"; // 30 chars
  const germanIdMrz = ethers.toUtf8Bytes(germanIdLine1 + germanIdLine2 + germanIdLine3);
  // Pad to at least 94 bytes (ofacEnd=93)
  const germanIdMRZ = new Uint8Array([...germanIdMrz, 1, 1, 1, 1]);

  describe("D<< normalization for nationality", function () {
    it("should return UTO unchanged for standard passport", async function () {
      const result = await testHandler.testGetNationality(E_PASSPORT, standardMRZ);
      expect(result).to.equal("UTO");
    });

    it("should normalize D<< to DEU for German passport nationality", async function () {
      const result = await testHandler.testGetNationality(E_PASSPORT, germanPassportMRZ);
      expect(result).to.equal("DEU");
    });

    it("should normalize D<< to DEU for German ID card nationality", async function () {
      const result = await testHandler.testGetNationality(EU_ID_CARD, germanIdMRZ);
      expect(result).to.equal("DEU");
    });
  });

  describe("D<< normalization for issuing state", function () {
    it("should return UTO unchanged for standard passport", async function () {
      const result = await testHandler.testGetIssuingState(E_PASSPORT, standardMRZ);
      expect(result).to.equal("UTO");
    });

    it("should normalize D<< to DEU for German passport issuing state", async function () {
      const result = await testHandler.testGetIssuingState(E_PASSPORT, germanPassportMRZ);
      expect(result).to.equal("DEU");
    });

    it("should normalize D<< to DEU for German ID card issuing state", async function () {
      const result = await testHandler.testGetIssuingState(EU_ID_CARD, germanIdMRZ);
      expect(result).to.equal("DEU");
    });
  });

  describe("extractStringAttribute (no normalization)", function () {
    it("should return raw D<< when extracting directly", async function () {
      const result = await testHandler.testExtractStringAttribute(germanPassportMRZ, 2, 4);
      expect(result).to.equal("D<<");
    });

    it("should return standard codes unchanged", async function () {
      const result = await testHandler.testExtractStringAttribute(standardMRZ, 54, 56);
      expect(result).to.equal("UTO");
    });
  });
});
