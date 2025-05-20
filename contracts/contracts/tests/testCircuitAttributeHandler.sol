// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CircuitAttributeHandler} from "../libraries/CircuitAttributeHandler.sol";

contract TestCircuitAttributeHandler {
    function testGetIssuingState(bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandler.getIssuingState(charcodes);
    }

    function testGetName(bytes memory charcodes) external pure returns (string[] memory) {
        return CircuitAttributeHandler.getName(charcodes);
    }

    function testGetPassportNumber(bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandler.getPassportNumber(charcodes);
    }

    function testGetNationality(bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandler.getNationality(charcodes);
    }

    function testGetDateOfBirth(bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandler.getDateOfBirth(charcodes);
    }

    function testGetGender(bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandler.getGender(charcodes);
    }

    function testGetExpiryDate(bytes memory charcodes) external pure returns (string memory) {
        return CircuitAttributeHandler.getExpiryDate(charcodes);
    }

    function testGetOlderThan(bytes memory charcodes) external pure returns (uint256) {
        return CircuitAttributeHandler.getOlderThan(charcodes);
    }

    function testGetPassportNoOfac(bytes memory charcodes) external pure returns (uint256) {
        return CircuitAttributeHandler.getPassportNoOfac(charcodes);
    }

    function testGetNameAndDobOfac(bytes memory charcodes) external pure returns (uint256) {
        return CircuitAttributeHandler.getNameAndDobOfac(charcodes);
    }

    function testGetNameAndYobOfac(bytes memory charcodes) external pure returns (uint256) {
        return CircuitAttributeHandler.getNameAndYobOfac(charcodes);
    }

    function testCompareOlderThan(bytes memory charcodes, uint256 olderThan) external pure returns (bool) {
        return CircuitAttributeHandler.compareOlderThan(charcodes, olderThan);
    }

    function testCompareOfac(
        bytes memory charcodes,
        bool checkPassportNo,
        bool checkNameAndDob,
        bool checkNameAndYob
    ) external pure returns (bool) {
        return CircuitAttributeHandler.compareOfac(charcodes, checkPassportNo, checkNameAndDob, checkNameAndYob);
    }

    function testExtractStringAttribute(
        bytes memory charcodes,
        uint256 start,
        uint256 end
    ) external pure returns (string memory) {
        return CircuitAttributeHandler.extractStringAttribute(charcodes, start, end);
    }
}
