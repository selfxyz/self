import { expect } from "chai";
import { ethers } from "hardhat";
import { TestCircuitAttributeHandler } from "../../typechain-types";
import { CircuitAttributeHandler } from "../utils/formatter";

describe("CircuitAttributeHandler", function () {
  let testHandler: TestCircuitAttributeHandler;

  before(async function () {
    const TestHandlerFactory = await ethers.getContractFactory("TestCircuitAttributeHandler");
    testHandler = await TestHandlerFactory.deploy();
    await testHandler.waitForDeployment();
  });

  const mrz = ethers.toUtf8Bytes(
    "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" + "L898902C36UTO7408122F1204159ZE184226B<<<<<1018",
  );
  const sampleMRZ = new Uint8Array([...mrz, 1, 1, 1]);

  describe("getIssuingState", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetIssuingState(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getIssuingState(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("UTO");
    });
  });

  describe("getName", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetName(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getName(sampleMRZ);
      expect(contractResult[0]).to.equal(tsResult[0]);
      expect(contractResult[1]).to.equal(tsResult[1]);
      expect(contractResult[0]).to.equal("ANNA MARIA");
      expect(contractResult[1]).to.equal("ERIKSSON");
    });
  });

  describe("getPassportNumber", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetPassportNumber(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getPassportNumber(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("L898902C3");
    });
  });

  describe("getNationality", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetNationality(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getNationality(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("UTO");
    });
  });

  describe("getDateOfBirth", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetDateOfBirth(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getDateOfBirth(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("12-08-74");
    });
  });

  describe("getGender", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetGender(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getGender(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("F");
    });
  });

  describe("getExpiryDate", function () {
    it("should match contract and ts implementation", async function () {
      const contractResult = await testHandler.testGetExpiryDate(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getExpiryDate(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("15-04-12");
    });
  });

  describe("getOlderThan and compareOlderThan", function () {
    it("should match contract and ts implementation for getOlderThan", async function () {
      const contractResult = await testHandler.testGetOlderThan(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getOlderThan(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal(18);
    });

    it("should match contract and ts implementation for compareOlderThan", async function () {
      const contractResult = await testHandler.testCompareOlderThan(sampleMRZ, 18);
      const tsResult = CircuitAttributeHandler.compareOlderThan(sampleMRZ, 18);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.be.true;

      const contractResultFalse = await testHandler.testCompareOlderThan(sampleMRZ, 19);
      const tsResultFalse = CircuitAttributeHandler.compareOlderThan(sampleMRZ, 19);
      expect(contractResultFalse).to.equal(tsResultFalse);
      expect(contractResultFalse).to.be.false;
    });
  });

  describe("getPassportNoOfac, getNameAndDobOfac, getNameAndYobOfac and compareOfac", function () {
    it("should match contract and ts implementation for getPassportNoOfac, getNameAndDobOfac, getNameAndYobOfac", async function () {
      const contractResult = await testHandler.testGetPassportNoOfac(sampleMRZ);
      const tsResult = CircuitAttributeHandler.getPassportNoOfac(sampleMRZ);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal(1);

      const contractResult2 = await testHandler.testGetNameAndDobOfac(sampleMRZ);
      const tsResult2 = CircuitAttributeHandler.getNameAndDobOfac(sampleMRZ);
      expect(contractResult2).to.equal(tsResult2);
      expect(contractResult2).to.equal(1);

      const contractResult3 = await testHandler.testGetNameAndYobOfac(sampleMRZ);
      const tsResult3 = CircuitAttributeHandler.getNameAndYobOfac(sampleMRZ);
      expect(contractResult3).to.equal(tsResult3);
      expect(contractResult3).to.equal(1);
    });

    it("should match contract and ts implementation for individual OFAC checks using flags", async function () {
      // Test passport number check
      const contractPassportNo = await testHandler.testCompareOfac(sampleMRZ, true, false, false);
      const tsPassportNo = CircuitAttributeHandler.compareOfac(sampleMRZ, true, false, false);
      expect(contractPassportNo).to.equal(tsPassportNo);
      expect(contractPassportNo).to.be.true;

      // Test name and DOB check
      const contractNameDob = await testHandler.testCompareOfac(sampleMRZ, false, true, false);
      const tsNameDob = CircuitAttributeHandler.compareOfac(sampleMRZ, false, true, false);
      expect(contractNameDob).to.equal(tsNameDob);
      expect(contractNameDob).to.be.true;

      // Test name and YOB check
      const contractNameYob = await testHandler.testCompareOfac(sampleMRZ, false, false, true);
      const tsNameYob = CircuitAttributeHandler.compareOfac(sampleMRZ, false, false, true);
      expect(contractNameYob).to.equal(tsNameYob);
      expect(contractNameYob).to.be.true;
    });

    it("should match contract and ts implementation for compareOfac", async function () {
      // Test with all flags true
      const contractAllTrue = await testHandler.testCompareOfac(sampleMRZ, true, true, true);
      const tsAllTrue = CircuitAttributeHandler.compareOfac(sampleMRZ, true, true, true);
      expect(contractAllTrue).to.equal(tsAllTrue);
      expect(contractAllTrue).to.be.true;

      // Test with some flags false
      const contractSomeTrue = await testHandler.testCompareOfac(sampleMRZ, true, false, true);
      const tsSomeTrue = CircuitAttributeHandler.compareOfac(sampleMRZ, true, false, true);
      expect(contractSomeTrue).to.equal(tsSomeTrue);
      expect(contractSomeTrue).to.be.true;
    });
  });

  describe("extractStringAttribute", function () {
    it("should match contract and ts implementation for different positions", async function () {
      const testCases = [
        { start: 2, end: 4, expected: "UTO" },
        { start: 44, end: 52, expected: "L898902C3" },
        { start: 54, end: 56, expected: "UTO" },
        { start: 64, end: 64, expected: "F" },
      ];

      for (const testCase of testCases) {
        const contractResult = await testHandler.testExtractStringAttribute(sampleMRZ, testCase.start, testCase.end);
        const tsResult = CircuitAttributeHandler.extractStringAttribute(sampleMRZ, testCase.start, testCase.end);
        expect(contractResult).to.equal(tsResult);
        expect(contractResult).to.equal(testCase.expected);
      }
    });

    it("should handle errors consistently between contract and ts", async function () {
      const shortMRZ = ethers.toUtf8Bytes("ABC");
      await expect(testHandler.testExtractStringAttribute(shortMRZ, 0, 5)).to.be.revertedWithCustomError(
        testHandler,
        "InsufficientCharcodeLen",
      );

      expect(() => CircuitAttributeHandler.extractStringAttribute(shortMRZ, 0, 5)).to.throw("InsufficientCharcodeLen");
    });

    it("should match contract and ts implementation for empty range", async function () {
      const contractResult = await testHandler.testExtractStringAttribute(sampleMRZ, 2, 2);
      const tsResult = CircuitAttributeHandler.extractStringAttribute(sampleMRZ, 2, 2);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("U");
    });
  });
});
