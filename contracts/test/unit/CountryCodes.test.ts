import { expect } from "chai";
import { ethers } from "hardhat";
import { TestCountryCodes } from "../../typechain-types";

describe("CountryCodes", function () {
  let testCountryCodes: TestCountryCodes;

  before(async function () {
    const TestCountryCodesFactory = await ethers.getContractFactory("TestCountryCodes");
    testCountryCodes = await TestCountryCodesFactory.deploy();
    await testCountryCodes.waitForDeployment();
  });

  describe("Individual country code access", function () {
    it("should return correct code for Afghanistan", async function () {
      const code = await testCountryCodes.getAfghanistan();
      expect(code).to.equal("AFG");
    });

    it("should return correct code for United States", async function () {
      const code = await testCountryCodes.getUnitedStates();
      expect(code).to.equal("USA");
    });

    it("should return correct code for China", async function () {
      const code = await testCountryCodes.getChina();
      expect(code).to.equal("CHN");
    });

    it("should return correct code for Russia", async function () {
      const code = await testCountryCodes.getRussia();
      expect(code).to.equal("RUS");
    });

    it("should return correct code for Iran", async function () {
      const code = await testCountryCodes.getIran();
      expect(code).to.equal("IRN");
    });

    it("should return correct code for Cuba", async function () {
      const code = await testCountryCodes.getCuba();
      expect(code).to.equal("CUB");
    });

    it("should return correct code for Syria", async function () {
      const code = await testCountryCodes.getSyria();
      expect(code).to.equal("SYR");
    });

    it("should return correct code for North Korea", async function () {
      const code = await testCountryCodes.getNorthKorea();
      expect(code).to.equal("PRK");
    });
  });

  describe("Array usage", function () {
    it("should work when building arrays of forbidden countries", async function () {
      const countries = await testCountryCodes.getSampleForbiddenCountries();

      expect(countries).to.have.length(6);
      expect(countries[0]).to.equal("CHN"); // China
      expect(countries[1]).to.equal("RUS"); // Russia
      expect(countries[2]).to.equal("IRN"); // Iran
      expect(countries[3]).to.equal("PRK"); // North Korea
      expect(countries[4]).to.equal("CUB"); // Cuba
      expect(countries[5]).to.equal("SYR"); // Syria
    });
  });

  describe("Code validity", function () {
    it("should all be 3 characters long", async function () {
      const countries = await testCountryCodes.getSampleForbiddenCountries();

      for (const country of countries) {
        expect(country).to.have.length(3);
      }
    });

    it("should all be uppercase", async function () {
      const countries = await testCountryCodes.getSampleForbiddenCountries();

      for (const country of countries) {
        expect(country).to.equal(country.toUpperCase());
      }
    });
  });
});
