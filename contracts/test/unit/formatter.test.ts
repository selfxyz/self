import { expect } from "chai";
import { ethers } from "hardhat";
import { TestFormatter } from "../../typechain-types";
import { Formatter } from "../utils/formatter";
import { BigNumberish } from "ethers";

describe("Formatter", function () {
  let testFormatter: TestFormatter;

  before(async function () {
    const TestFormatterFactory = await ethers.getContractFactory("TestFormatter");
    testFormatter = await TestFormatterFactory.deploy();
    await testFormatter.waitForDeployment();
  });

  describe("formatName", function () {
    it("should match contract and ts implementation", async function () {
      const input = "DUPONT<<ALPHONSE<HUGHUES<ALBERT<<<";
      const contractResult = await testFormatter.testFormatName(input);
      const tsResult = Formatter.formatName(input);
      expect(contractResult[0]).to.equal(tsResult[0]);
      expect(contractResult[1]).to.equal(tsResult[1]);
      expect(contractResult[0]).to.equal("ALPHONSE HUGHUES ALBERT");
      expect(contractResult[1]).to.equal("DUPONT");
    });

    it("should match contract and ts implementation for single name", async function () {
      const input = "SMITH<<JOHN<<<";
      const contractResult = await testFormatter.testFormatName(input);
      const tsResult = Formatter.formatName(input);
      expect(contractResult[0]).to.equal(tsResult[0]);
      expect(contractResult[1]).to.equal(tsResult[1]);
      expect(contractResult[0]).to.equal("JOHN");
      expect(contractResult[1]).to.equal("SMITH");
    });
  });

  describe("formatDate", function () {
    it("should match contract and ts implementation", async function () {
      const input = "940131";
      const contractResult = await testFormatter.testFormatDate(input);
      const tsResult = Formatter.formatDate(input);
      expect(contractResult).to.equal(tsResult);
      expect(contractResult).to.equal("31-01-94");
    });

    it("should handle errors consistently between contract and ts", async function () {
      const input = "12345";
      await expect(testFormatter.testFormatDate(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDateLength",
      );
      expect(() => Formatter.formatDate(input)).to.throw("InvalidDateLength");
    });

    it("should handle errors consistently when month is out of range", async function () {
      const input = "941331";
      await expect(testFormatter.testFormatDate(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidMonthRange",
      );
      expect(() => Formatter.formatDate(input)).to.throw("InvalidMonthRange");
    });

    it("should handle errors consistently when month is out of range (more than 20)", async function () {
      const input = "942032";
      await expect(testFormatter.testFormatDate(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidMonthRange",
      );
      expect(() => Formatter.formatDate(input)).to.throw("InvalidMonthRange");
    });

    it("should handle errors consistently when day is out of range (more than 31)", async function () {
      const input = "940132";
      await expect(testFormatter.testFormatDate(input)).to.be.revertedWithCustomError(testFormatter, "InvalidDayRange");
      expect(() => Formatter.formatDate(input)).to.throw("InvalidDayRange");
    });

    it("should handle errors consistently when day is out of range (more than 40)", async function () {
      const input = "940140";
      await expect(testFormatter.testFormatDate(input)).to.be.revertedWithCustomError(testFormatter, "InvalidDayRange");
      expect(() => Formatter.formatDate(input)).to.throw("InvalidDayRange");
    });
  });

  describe("numAsciiToUint", function () {
    it("should match contract and ts implementation for valid ASCII numbers", async function () {
      for (let i = 0; i <= 9; i++) {
        const input = 48 + i;
        const contractResult = await testFormatter.testNumAsciiToUint(input);
        const tsResult = Formatter.numAsciiToUint(input);
        expect(contractResult).to.equal(tsResult);
        expect(contractResult).to.equal(i);
      }
    });
  });

  describe("fieldElementsToBytes", function () {
    it("should match contract and ts implementation", async function () {
      const input: [BigNumberish, BigNumberish, BigNumberish] = [123n, 456n, 789n];
      const contractResult = await testFormatter.testFieldElementsToBytes(input);
      const tsResult = toHexString(Formatter.fieldElementsToBytes(input as [bigint, bigint, bigint]));
      expect(contractResult).to.deep.equal(tsResult);
    });

    it("should match contract and ts implementation for zero values", async function () {
      const input: [BigNumberish, BigNumberish, BigNumberish] = [0n, 0n, 0n];
      const contractResult = await testFormatter.testFieldElementsToBytes(input);
      const tsResult = toHexString(Formatter.fieldElementsToBytes(input as [bigint, bigint, bigint]));
      expect(contractResult).to.deep.equal(tsResult);
    });

    it("should revert when field element is out of range", async function () {
      const input = [21888242871839275222246405745257275088548364400416034343698204186575808495617n, 0n, 0n] as [
        bigint,
        bigint,
        bigint,
      ];
      await expect(testFormatter.testFieldElementsToBytes(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidFieldElement",
      );
    });

    it("should revert when field element is out of range", async function () {
      const input = [0n, 21888242871839275222246405745257275088548364400416034343698204186575808495617n, 0n] as [
        bigint,
        bigint,
        bigint,
      ];
      await expect(testFormatter.testFieldElementsToBytes(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidFieldElement",
      );
    });

    it("should revert when field element is out of range", async function () {
      const input = [0n, 0n, 21888242871839275222246405745257275088548364400416034343698204186575808495617n] as [
        bigint,
        bigint,
        bigint,
      ];
      await expect(testFormatter.testFieldElementsToBytes(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidFieldElement",
      );
    });
  });

  describe("extractForbiddenCountriesFromPacked", function () {
    it("should match contract and ts implementation", async function () {
      const input1 = "0x414754414154414149414f4741444e414d5341415a44424c41414c41474641";
      const input2 = "0x4542524c42425242444742524842534842455a415355415742414d52414752";
      const input3 = "0x4e41434d484b5650434e52424c4f424e5442554d424e45425a4c42554d424c";
      const input4 = "0x4853454d4559424d5a45575a5455564b4e445453454e4843564943";
      const contractResult = await testFormatter.testExtractForbiddenCountriesFromPacked([
        input1,
        input2,
        input3,
        input4,
      ]);
      const tsResult: string[] = Formatter.extractForbiddenCountriesFromPacked([input1, input2, input3, input4], "id");
      let formattedTsResult = tsResult
        .map((item: string, index: number) => {
          if (index % 3 === 0) {
            return item + tsResult[index + 1] + tsResult[index + 2];
          }
          return undefined;
        })
        .filter(Boolean);
      expect(contractResult).to.deep.equal(formattedTsResult);
    });

    it("should revert when field element is out of range", async function () {
      const input = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

      await expect(
        testFormatter.testExtractForbiddenCountriesFromPacked([input, 0n, 0n, 0n]),
      ).to.be.revertedWithCustomError(testFormatter, "InvalidFieldElement");
    });
  });

  describe("proofDateToUnixTimestamp", function () {
    it("should match contract and ts implementation", async function () {
      const testCases = [
        {
          input: [9, 4, 0, 1, 3, 1],
          expected: 3915734400n,
        },
        {
          input: [0, 0, 0, 1, 0, 1],
          expected: 946684800n,
        },
        {
          input: [2, 0, 0, 2, 2, 9],
          expected: 1582934400n,
        },
      ];

      for (const testCase of testCases) {
        const contractResult = await testFormatter.testProofDateToUnixTimestamp(testCase.input);
        const tsResult = Formatter.proofDateToUnixTimestamp(testCase.input);
        expect(contractResult).to.equal(BigInt(tsResult));
        expect(contractResult).to.equal(testCase.expected);
      }
    });

    it("should revert when date digit is out of range", async function () {
      const input = [9, 4, 0, 1, 2, 10];
      await expect(testFormatter.testProofDateToUnixTimestamp(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDateDigit",
      );
    });
  });

  describe("dateToUnixTimestamp", function () {
    it("should match contract and ts implementation", async function () {
      const testCases = [
        {
          input: "940131",
          expected: 3915734400n,
        },
        {
          input: "000101",
          expected: 946684800n,
        },
      ];

      for (const testCase of testCases) {
        const contractResult = await testFormatter.testDateToUnixTimestamp(testCase.input);
        const tsResult = Formatter.dateToUnixTimestamp(testCase.input);
        expect(contractResult).to.equal(BigInt(tsResult));
        expect(contractResult).to.equal(testCase.expected);
      }
    });

    it("should handle errors consistently between contract and ts", async function () {
      const input = "12345";
      await expect(testFormatter.testDateToUnixTimestamp(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDateLength",
      );
      expect(() => Formatter.dateToUnixTimestamp(input)).to.throw("InvalidDateLength");
    });

    it("should revert when month is out of range (more than 12)", async function () {
      const input = "941331";
      await expect(testFormatter.testDateToUnixTimestamp(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidMonthRange",
      );
    });

    it("should revert when month is out of range (more than 20)", async function () {
      const input = "942031";
      await expect(testFormatter.testDateToUnixTimestamp(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidMonthRange",
      );
    });

    it("should revert when day is out of range (more than 31)", async function () {
      const input = "940132";
      await expect(testFormatter.testDateToUnixTimestamp(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDayRange",
      );
    });

    it("should revert when day is out of range (more than 40)", async function () {
      const input = "940140";
      await expect(testFormatter.testDateToUnixTimestamp(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDayRange",
      );
    });
  });

  describe("substring", function () {
    it("should match contract and ts implementation", async function () {
      const testCases = [
        { str: "ABCDEF", start: 0, end: 3, expected: "ABC" },
        { str: "ABCDEF", start: 2, end: 4, expected: "CD" },
        { str: "ABCDEF", start: 0, end: 6, expected: "ABCDEF" },
      ];

      for (const testCase of testCases) {
        const contractResult = await testFormatter.testSubstring(testCase.str, testCase.start, testCase.end);
        const tsResult = Formatter.substring(testCase.str, testCase.start, testCase.end);
        expect(contractResult).to.equal(tsResult);
        expect(contractResult).to.equal(testCase.expected);
      }
    });
  });

  describe("parseDatePart", function () {
    it("should match contract and ts implementation", async function () {
      const testCases = [
        { input: "12", expected: 12 },
        { input: "01", expected: 1 },
        { input: "00", expected: 0 },
        { input: "", expected: 0 },
      ];

      for (const testCase of testCases) {
        const contractResult = await testFormatter.testParseDatePart(testCase.input);
        const tsResult = Formatter.parseDatePart(testCase.input);
        expect(contractResult).to.equal(tsResult);
        expect(contractResult).to.equal(testCase.expected);
      }
    });
  });

  describe("toTimestamp", function () {
    it("should match contract and ts implementation", async function () {
      const testCases = [
        {
          year: 2000,
          month: 1,
          day: 1,
          expected: 946684800n,
        },
        {
          year: 2020,
          month: 2,
          day: 29,
          expected: 1582934400n,
        },
      ];

      for (const testCase of testCases) {
        const contractResult = await testFormatter.testToTimestamp(testCase.year, testCase.month, testCase.day);
        const tsResult = Formatter.toTimestamp(testCase.year, testCase.month, testCase.day);
        expect(contractResult).to.equal(BigInt(tsResult));
        expect(contractResult).to.equal(testCase.expected);
      }
    });

    it("should revert when year is out of range", async function () {
      const input = 1969;
      await expect(testFormatter.testToTimestamp(input, 1, 1)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidYearRange",
      );
    });

    it("should revert when year is out of range", async function () {
      const input = 2101;
      await expect(testFormatter.testToTimestamp(input, 1, 1)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidYearRange",
      );
    });

    it("should revert when month is out of range", async function () {
      const input = 13;
      await expect(testFormatter.testToTimestamp(2000, input, 1)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidMonthRange",
      );
    });

    it("should revert when month is out of range", async function () {
      const input = 0;
      await expect(testFormatter.testToTimestamp(2000, input, 1)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidMonthRange",
      );
    });

    it("should revert when day is out of range", async function () {
      const input = 32;
      await expect(testFormatter.testToTimestamp(2000, 1, input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDayRange",
      );
    });

    it("should revert when day is out of range", async function () {
      const input = 0;
      await expect(testFormatter.testToTimestamp(2000, 1, input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidDayRange",
      );
    });
  });

  describe("isLeapYear", function () {
    it("should match contract and ts implementation", async function () {
      const testCases = [
        { year: 2000, expected: true },
        { year: 2020, expected: true },
        { year: 2001, expected: false },
        { year: 2042, expected: false },
        { year: 2100, expected: false },
        { year: 1970, expected: false },
      ];

      for (const testCase of testCases) {
        const contractResult = await testFormatter.testIsLeapYear(testCase.year);
        const tsResult = Formatter.isLeapYear(testCase.year);
        expect(contractResult).to.equal(tsResult);
        expect(contractResult).to.equal(testCase.expected);
      }
    });

    it("should revert when year is out of range", async function () {
      const input = 1969;
      await expect(testFormatter.testIsLeapYear(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidYearRange",
      );
    });

    it("should revert when year is out of range", async function () {
      const input = 2101;
      await expect(testFormatter.testIsLeapYear(input)).to.be.revertedWithCustomError(
        testFormatter,
        "InvalidYearRange",
      );
    });
  });
});

function toHexString(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
