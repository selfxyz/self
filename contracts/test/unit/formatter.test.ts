import { expect } from "chai";
import { ethers } from "hardhat";
import { TestFormatter } from "../../typechain-types";
import { generateRandomFieldElement } from "../utils/utils";

describe("Formatter", function () {
    let testFormatter: TestFormatter;

    before(async function () {
        const TestFormatterFactory = await ethers.getContractFactory("TestFormatter");
        testFormatter = await TestFormatterFactory.deploy();
        await testFormatter.waitForDeployment();
    });

    describe("formatName", function () {
        it("should correctly format a passport name", async function () {
            const result = await testFormatter.testFormatName("DUPONT<<ALPHONSE<HUGHUES<ALBERT<<<");
            expect(result[0]).to.equal("ALPHONSE HUGHUES ALBERT");
            expect(result[1]).to.equal("DUPONT");
        });
    });

    describe("formatDate", function () {
        it("should correctly format a date", async function () {
            const result = await testFormatter.testFormatDate("940131");
            expect(result).to.equal("31-01-94");
        });

        it("should revert with invalid date length", async function () {
            await expect(testFormatter.testFormatDate("12345")).to.be.revertedWithCustomError(
                testFormatter,
                "InvalidDateLength"
            );
        });
    });

    describe("numAsciiToUint", function () {
        it("should convert valid ASCII numbers", async function () {
            const result = await testFormatter.testNumAsciiToUint(49); // ASCII for "1"
            expect(result).to.equal(1);
        });

        it("should revert with invalid ASCII code", async function () {
            await expect(testFormatter.testNumAsciiToUint(47)).to.be.revertedWithCustomError(
                testFormatter,
                "InvalidAsciiCode"
            );
        });
    });

    describe("dateToUnixTimestamp", function () {
        it("should convert date to unix timestamp", async function () {
            const result = await testFormatter.testDateToUnixTimestamp("940131");
            // 31st Jan 1994 timestamp
            expect(result).to.equal(3915734400);
        });
    });

    describe("substring", function () {
        it("should return correct substring", async function () {
            const result = await testFormatter.testSubstring("940131", 0, 2);
            expect(result).to.equal("94");
        });
    });

    describe("fieldElementsToBytes", function () {
        it("should convert field elements to bytes", async function () {
            const input = [
                generateRandomFieldElement(),
                generateRandomFieldElement(),
                generateRandomFieldElement()
            ];
            const result = await testFormatter.testFieldElementsToBytes(input);
            expect(result.length).to.equal(91);
        });
    });

    describe("extractForbiddenCountriesFromPacked", function () {
        it("should extract forbidden countries from packed data", async function () {
            // Create a packed value that represents "AAA" in the first position
            const packedValue = ethers.BigNumber.from("0x414141"); // ASCII for "AAA"
            const result = await testFormatter.testExtractForbiddenCountriesFromPacked(packedValue);
            expect(result[0]).to.equal("AAA");
        });
    });
});
