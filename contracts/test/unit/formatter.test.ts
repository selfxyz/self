import { expect } from "chai";
import { ethers } from "hardhat";
import { TestFormatter } from "../../typechain-types";

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

        it("should handle single name", async function () {
            const result = await testFormatter.testFormatName("SMITH<<JOHN<<<");
            expect(result[0]).to.equal("JOHN");
            expect(result[1]).to.equal("SMITH");
        });
    });

    describe("formatDate", function () {
        it("should correctly format a date", async function () {
            const result = await testFormatter.testFormatDate("940131");
            expect(result).to.equal("31-01-94");
        });

        it("should revert with invalid date length", async function () {
            await expect(testFormatter.testFormatDate("12345"))
                .to.be.revertedWithCustomError(testFormatter, "InvalidDateLength");
        });
    });

    describe("numAsciiToUint", function () {
        it("should convert valid ASCII numbers", async function () {
            for(let i = 0; i <= 9; i++) {
                const result = await testFormatter.testNumAsciiToUint(48 + i);
                expect(result).to.equal(i);
            }
        });

        it("should revert with invalid ASCII code", async function () {
            await expect(testFormatter.testNumAsciiToUint(47))
                .to.be.revertedWithCustomError(testFormatter, "InvalidAsciiCode");
            await expect(testFormatter.testNumAsciiToUint(58))
                .to.be.revertedWithCustomError(testFormatter, "InvalidAsciiCode");
        });
    });

    describe("fieldElementsToBytes", function () {
        it("should convert field elements to bytes", async function () {
            const input = [123n, 456n, 789n];
            const result = await testFormatter.testFieldElementsToBytes(input);
            expect(result.length).to.equal(184);
        });

        it("should handle zero values", async function () {
            const input = [0n, 0n, 0n];
            const result = await testFormatter.testFieldElementsToBytes(input);
            expect(result.length).to.equal(184);
        });
    });

    describe("extractForbiddenCountriesFromPacked", function () {
        it("should extract single forbidden country", async function () {
            const packedValue = "0x414141";
            const result = await testFormatter.testExtractForbiddenCountriesFromPacked(packedValue);
            expect(result[0]).to.equal("AAA");
        });

        it("should handle multiple forbidden countries", async function () {
            const packedValue = "0x414141424242";
            const result = await testFormatter.testExtractForbiddenCountriesFromPacked(packedValue);
            expect(result[0]).to.equal("BBB");
            expect(result[1]).to.equal("AAA");
        });
    });

    describe("dateToUnixTimestamp", function () {
        it("should convert various dates to unix timestamp", async function () {
            const testCases = [
                { input: "940131", expected: 3915734400n },
                { input: "000101", expected: 946684800n },
                { input: "200229", expected: 1582934400n }, 
            ];

            for (const testCase of testCases) {
                const result = await testFormatter.testDateToUnixTimestamp(testCase.input);
                expect(result).to.equal(testCase.expected);
            }
        });

        it("should revert with invalid date length", async function () {
            await expect(testFormatter.testDateToUnixTimestamp("12345"))
                .to.be.revertedWithCustomError(testFormatter, "InvalidDateLength");
        });
    });

    describe("parseDatePart", function () {
        it("should parse valid date parts", async function () {
            const testCases = [
                { input: "01", expected: 1n },
                { input: "12", expected: 12n },
                { input: "31", expected: 31n },
            ];

            for (const testCase of testCases) {
                const result = await testFormatter.testParseDatePart(testCase.input);
                expect(result).to.equal(testCase.expected);
            }
        });

        it("should handle empty string", async function () {
            const result = await testFormatter.testParseDatePart("");
            expect(result).to.equal(0n);
        });
    });

    describe("isLeapYear", function () {
        it("should correctly identify leap years", async function () {
            const leapYears = [2000, 2004, 2008, 2012, 2016, 2020];
            const nonLeapYears = [1900, 2001, 2002, 2003, 2100];

            for (const year of leapYears) {
                const result = await testFormatter.testIsLeapYear(year);
                expect(result).to.be.true;
            }

            for (const year of nonLeapYears) {
                const result = await testFormatter.testIsLeapYear(year);
                expect(result).to.be.false;
            }
        });
    });

    describe("substring", function () {
        it("should return correct substrings", async function () {
            const testCases = [
                { str: "940131", start: 0, end: 2, expected: "94" },
                { str: "940131", start: 2, end: 4, expected: "01" },
                { str: "940131", start: 4, end: 6, expected: "31" },
                { str: "ABCDEF", start: 1, end: 4, expected: "BCD" },
            ];

            for (const testCase of testCases) {
                const result = await testFormatter.testSubstring(
                    testCase.str,
                    testCase.start,
                    testCase.end
                );
                expect(result).to.equal(testCase.expected);
            }
        });
    });

    describe("proofDateToUnixTimestamp", function () {
        it("should convert proof date array to unix timestamp", async function () {
            const testCases = [
                {
                    input: [9, 4, 0, 1, 3, 1],
                    expected: 3915734400n
                },
                {
                    input: [0, 0, 0, 1, 0, 1],
                    expected: 946684800n 
                },
                {
                    input: [2, 0, 0, 2, 2, 9],
                    expected: 1582934400n      
                }
            ];

            for (const testCase of testCases) {
                const result = await testFormatter.testProofDateToUnixTimestamp(testCase.input);
                expect(result).to.equal(testCase.expected);
            }
        });

        it("should handle edge cases", async function () {
            const result = await testFormatter.testProofDateToUnixTimestamp([2, 5, 1, 2, 3, 1]);
            expect(result).to.equal(1767139200n);
        });
    });

    describe("toTimestamp", function () {
        it("should convert date components to unix timestamp", async function () {
            const testCases = [
                {
                    year: 2000,
                    month: 1,
                    day: 1,
                    expected: 946684800n
                },
                {
                    year: 2020,
                    month: 2,
                    day: 29,
                    expected: 1582934400n
                }
            ];

            for (const testCase of testCases) {
                const result = await testFormatter.testToTimestamp(
                    testCase.year,
                    testCase.month,
                    testCase.day
                );
                expect(result).to.equal(testCase.expected);
            }
        });

        it("should handle edge cases", async function () {
            const result = await testFormatter.testToTimestamp(2099, 12, 31);
            expect(result).to.equal(4102358400n);
        });
    });
});
