import { expect } from "chai";
import { ethers } from "hardhat";
import { TestSelfUtils, TestCountryCodes } from "../../typechain-types";
import { packForbiddenCountriesList } from "@selfxyz/common/utils/contracts";

describe("SelfUtils", function () {
  let testSelfUtils: TestSelfUtils;

  before(async function () {
    const TestSelfUtilsFactory = await ethers.getContractFactory("TestSelfUtils");
    testSelfUtils = await TestSelfUtilsFactory.deploy();
    await testSelfUtils.waitForDeployment();
  });

  describe("packForbiddenCountriesList", function () {
    it("should match contract and TypeScript implementation for empty array", async function () {
      const input: string[] = [];
      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(input);
      const tsResult = packForbiddenCountriesList(input);

      // Convert TypeScript result to the same format as contract result
      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should match contract and TypeScript implementation for single country", async function () {
      const input = ["USA"];
      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(input);
      const tsResult = packForbiddenCountriesList(input);

      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should match contract and TypeScript implementation for multiple countries", async function () {
      const input = ["USA", "GBR", "FRA", "DEU", "ITA"];
      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(input);
      const tsResult = packForbiddenCountriesList(input);

      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should match contract and TypeScript implementation for maximum capacity", async function () {
      // Create array that fills multiple chunks
      const countries = [];
      for (let i = 0; i < 41; i++) {
        // 41 * 3 = 123 bytes, needs 4 chunks (31 bytes each)
        countries.push(
          String.fromCharCode(65 + (i % 26)) +
            String.fromCharCode(65 + ((i + 1) % 26)) +
            String.fromCharCode(65 + ((i + 2) % 26)),
        );
      }

      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(countries);
      const tsResult = packForbiddenCountriesList(countries);

      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should match contract and TypeScript implementation for various country codes", async function () {
      const input = ["CHN", "RUS", "IRN", "PRK", "CUB", "SYR"];
      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(input);
      const tsResult = packForbiddenCountriesList(input);

      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should reject country codes that are too short", async function () {
      const input = ["US"]; // Too short

      // Both implementations should reject this
      expect(() => packForbiddenCountriesList(input)).to.throw("Invalid country code");
      await expect(testSelfUtils.testPackForbiddenCountriesList(input)).to.be.revertedWith(
        "Invalid country code: must be exactly 3 characters long",
      );
    });

    it("should reject country codes that are too long", async function () {
      const input = ["USAA"]; // Too long

      // Both implementations should reject this
      expect(() => packForbiddenCountriesList(input)).to.throw("Invalid country code");
      await expect(testSelfUtils.testPackForbiddenCountriesList(input)).to.be.revertedWith(
        "Invalid country code: must be exactly 3 characters long",
      );
    });

    it("should reject empty country codes", async function () {
      const input = [""]; // Empty

      // Both implementations should reject this
      expect(() => packForbiddenCountriesList(input)).to.throw("Invalid country code");
      await expect(testSelfUtils.testPackForbiddenCountriesList(input)).to.be.revertedWith(
        "Invalid country code: must be exactly 3 characters long",
      );
    });

    it("should handle mixed valid and invalid codes consistently", async function () {
      const input = ["USA", "GB"]; // One valid, one invalid

      // Both implementations should reject this
      expect(() => packForbiddenCountriesList(input)).to.throw("Invalid country code");
      await expect(testSelfUtils.testPackForbiddenCountriesList(input)).to.be.revertedWith(
        "Invalid country code: must be exactly 3 characters long",
      );
    });

    it("should handle special characters in country codes", async function () {
      const input = ["U-A", "GB1", "FR@"];
      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(input);
      const tsResult = packForbiddenCountriesList(input);

      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should produce deterministic results", async function () {
      const input = ["USA", "GBR", "FRA"];

      // Call multiple times to ensure deterministic behavior
      const contractResult1 = await testSelfUtils.testPackForbiddenCountriesList(input);
      const contractResult2 = await testSelfUtils.testPackForbiddenCountriesList(input);
      const tsResult1 = packForbiddenCountriesList(input);
      const tsResult2 = packForbiddenCountriesList(input);

      // Results should be identical across calls
      for (let i = 0; i < 4; i++) {
        expect(contractResult1[i]).to.equal(contractResult2[i]);
        expect(tsResult1[i]).to.equal(tsResult2[i]);
      }
    });

    it("should work with CountryCodes library", async function () {
      // Deploy CountryCodes test contract to access the constants
      const TestCountryCodesFactory = await ethers.getContractFactory("TestCountryCodes");
      const testCountryCodes = await TestCountryCodesFactory.deploy();
      await testCountryCodes.waitForDeployment();

      // Get country codes using the library
      const forbiddenCountriesFromContract = await testCountryCodes.getSampleForbiddenCountries();

      // Convert to regular array to avoid ethers read-only proxy issues
      const forbiddenCountries = [...forbiddenCountriesFromContract];

      // Test the contract
      const contractResult = await testSelfUtils.testPackForbiddenCountriesList(forbiddenCountries);
      const tsResult = packForbiddenCountriesList(forbiddenCountries);

      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }

      // Verify the countries are what we expect
      expect(forbiddenCountries).to.deep.equal(["CHN", "RUS", "IRN", "PRK", "CUB", "SYR"]);
    });

    it("should pack forbidden countries using CountryCodes constants", async function () {
      // Get packed result from contract that uses CountryCodes
      const contractResult = await testSelfUtils.testPackUsingCountryCodes();

      // Create equivalent array in TypeScript for comparison
      const forbiddenCountries = ["CHN", "RUS", "IRN", "PRK", "CUB", "SYR", "AFG", "SOM"];
      const tsResult = packForbiddenCountriesList(forbiddenCountries);
      const expectedResults = tsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(contractResult[i]).to.equal(expectedResults[i]);
      }
    });

    it("should pack different country combinations using CountryCodes", async function () {
      // Test high-risk countries
      const highRiskResult = await testSelfUtils.testPackHighRiskCountries();
      const highRiskCountries = ["AFG", "SOM", "SDN", "YEM"];
      const highRiskTsResult = packForbiddenCountriesList(highRiskCountries);
      const highRiskExpected = highRiskTsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(highRiskResult[i]).to.equal(highRiskExpected[i]);
      }

      // Test EU countries
      const euResult = await testSelfUtils.testPackEUCountries();
      const euCountries = ["DEU", "FRA", "ITA", "ESP", "NLD"];
      const euTsResult = packForbiddenCountriesList(euCountries);
      const euExpected = euTsResult.map((hex) => BigInt(hex));

      for (let i = 0; i < 4; i++) {
        expect(euResult[i]).to.equal(euExpected[i]);
      }
    });
  });
});
