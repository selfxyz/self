// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Formatter} from "../libraries/Formatter.sol";

contract TestFormatter {
    function testFormatName(string memory input) external pure returns (string[] memory) {
        return Formatter.formatName(input);
    }

    function testFormatDate(string memory date) external pure returns (string memory) {
        return Formatter.formatDate(date);
    }

    function testNumAsciiToUint(uint256 numAscii) external pure returns (uint256) {
        return Formatter.numAsciiToUint(numAscii);
    }

    function testFieldElementsToBytes(uint256[3] memory publicSignals) external pure returns (bytes memory) {
        return Formatter.fieldElementsToBytes(publicSignals);
    }

    function testExtractForbiddenCountriesFromPacked(
        uint256[4] memory publicSignals
    ) external pure returns (string[40] memory) {
        return Formatter.extractForbiddenCountriesFromPacked(publicSignals);
    }

    function testProofDateToUnixTimestamp(uint256[6] memory dateNum) external pure returns (uint256) {
        return Formatter.proofDateToUnixTimestamp(dateNum);
    }

    function testDateToUnixTimestamp(string memory date) external pure returns (uint256) {
        return Formatter.dateToUnixTimestamp(date);
    }

    function testSubstring(
        string memory str,
        uint256 startIndex,
        uint256 endIndex
    ) external pure returns (string memory) {
        return Formatter.substring(str, startIndex, endIndex);
    }

    function testParseDatePart(string memory value) external pure returns (uint256) {
        return Formatter.parseDatePart(value);
    }

    function testToTimestamp(uint256 year, uint256 month, uint256 day) external pure returns (uint256) {
        return Formatter.toTimestamp(year, month, day);
    }

    function testIsLeapYear(uint256 year) external pure returns (bool) {
        return Formatter.isLeapYear(year);
    }
}
