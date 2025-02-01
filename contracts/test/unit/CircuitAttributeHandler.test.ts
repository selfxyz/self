import { expect } from "chai";
import { ethers } from "hardhat";
import { TestCircuitAttributeHandler } from "../../typechain-types";

describe("CircuitAttributeHandler", function () {
    let testHandler: TestCircuitAttributeHandler;

    before(async function () {
        const TestHandlerFactory = await ethers.getContractFactory("TestCircuitAttributeHandler");
        testHandler = await TestHandlerFactory.deploy();
        await testHandler.waitForDeployment();
    });

    // Sample passport data in MRZ format
    const mrz = ethers.toUtf8Bytes(
        "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" +
        "L898902C36UTO7408122F1204159ZE184226B<<<<<1018"
    );
    const sampleMRZ = new Uint8Array([...mrz, 1]);

    describe("getIssuingState", function () {
        it("should correctly extract issuing state", async function () {
            const result = await testHandler.testGetIssuingState(sampleMRZ);
            expect(result).to.equal("UTO");
        });
    });

    describe("getName", function () {
        it("should correctly format passport name", async function () {
            const result = await testHandler.testGetName(sampleMRZ);
            expect(result[0]).to.equal("ANNA MARIA");
            expect(result[1]).to.equal("ERIKSSON");
        });
    });

    describe("getPassportNumber", function () {
        it("should correctly extract passport number", async function () {
            const result = await testHandler.testGetPassportNumber(sampleMRZ);
            expect(result).to.equal("L898902C3");
        });
    });

    describe("getNationality", function () {
        it("should correctly extract nationality", async function () {
            const result = await testHandler.testGetNationality(sampleMRZ);
            expect(result).to.equal("UTO");
        });
    });

    describe("getDateOfBirth", function () {
        it("should correctly format date of birth", async function () {
            const birthDate = await testHandler.testGetDateOfBirth(sampleMRZ);
            expect(birthDate).to.equal("12-08-74");
        });

    });

    describe("getGender", function () {
        it("should correctly extract gender", async function () {
            const result = await testHandler.testGetGender(sampleMRZ);
            expect(result).to.equal("F");
        });
    });

    describe("getExpiryDate", function () {
        it("should correctly format expiry date", async function () {
            const expiryDate = await testHandler.testGetExpiryDate(sampleMRZ);
            expect(expiryDate).to.equal("15-04-12");
        });
    });

    describe("getOlderThan and compareOlderThan", function () {
        it("should correctly extract age value", async function () {
            const olderThan = await testHandler.testGetOlderThan(sampleMRZ);
            expect(olderThan).to.equal(18);
        });

        it("should correctly compare ages", async function () {
            const comparisonTrue = await testHandler.testCompareOlderThan(sampleMRZ, 18);
            expect(comparisonTrue).to.be.true;

            const comparisonFalse = await testHandler.testCompareOlderThan(sampleMRZ, 19);
            expect(comparisonFalse).to.be.false;
        });
    });

    describe("getOfac and compareOfac", function () {
        it("should correctly extract OFAC status", async function () {
            const ofacStatus = await testHandler.testGetOfac(sampleMRZ);
            expect(ofacStatus).to.equal(1);
        });

        it("should correctly compare OFAC status", async () => {
            const comparisonTrue = await testHandler.testCompareOfac(sampleMRZ);
            expect(comparisonTrue).to.be.true;

            const mrx2 = ethers.toUtf8Bytes(
                "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" +
                "L898902C36UTO7408122F1204159ZE184226B<<<<<10180"
            );
            const sampleMRZ2 = new Uint8Array([...mrx2, 0]);

            const comparisonFalse = await testHandler.testCompareOfac(sampleMRZ2);
            expect(comparisonFalse).to.be.false;
        });
    });

    describe("extractStringAttribute", function () {
        it("should correctly extract string attributes from different positions", async function () {
            const testCases = [
                { start: 2, end: 4, expected: "UTO" },  // Issuing State
                { start: 44, end: 52, expected: "L898902C3" },  // Passport Number
                { start: 54, end: 56, expected: "UTO" },  // Nationality
                { start: 64, end: 64, expected: "F" },  // Gender
            ];

            for (const testCase of testCases) {
                const result = await testHandler.testExtractStringAttribute(
                    sampleMRZ,
                    testCase.start,
                    testCase.end
                );
                expect(result).to.equal(testCase.expected);
            }
        });

        it("should revert with insufficient length", async function () {
            const shortMRZ = ethers.toUtf8Bytes("ABC");
            await expect(testHandler.testExtractStringAttribute(shortMRZ, 0, 5))
                .to.be.revertedWithCustomError(testHandler, "INSUFFICIENT_CHARCODE_LEN");
        });

        it("should handle empty range", async function () {
            const result = await testHandler.testExtractStringAttribute(sampleMRZ, 2, 2);
            expect(result).to.equal("U");
        });
    });
});