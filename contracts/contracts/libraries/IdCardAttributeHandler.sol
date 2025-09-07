// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CircuitConstants} from "../constants/CircuitConstants.sol";
import {Formatter} from "./Formatter.sol";

/**
 * @title CircuitAttributeHandler Library
 * @notice Provides functions for extracting and formatting passport attributes from a byte array.
 * @dev Utilizes the Formatter library for converting and formatting specific fields.
 */
library IdCardAttributeHandler {
    /**
     * @dev Reverts when the provided character codes array does not contain enough data to extract an attribute.
     */
    error InsufficientCharcodeLen();

    // Define constant start and end positions for each attribute
    uint256 private constant ISSUING_STATE_START = 2;
    uint256 private constant ISSUING_STATE_END = 4;

    uint256 private constant NAME_START = 60;
    uint256 private constant NAME_END = 89;

    uint256 private constant ID_CARD_NUMBER_START = 5;
    uint256 private constant ID_CARD_NUMBER_END = 13;

    uint256 private constant NATIONALITY_START = 45;
    uint256 private constant NATIONALITY_END = 47;

    uint256 private constant DATE_OF_BIRTH_START = 30;
    uint256 private constant DATE_OF_BIRTH_END = 35;

    uint256 private constant GENDER_START = 37;
    uint256 private constant GENDER_END = 37;

    uint256 private constant EXPIRY_DATE_START = 38;
    uint256 private constant EXPIRY_DATE_END = 43;

    uint256 private constant OLDER_THAN_START = 90;
    uint256 private constant OLDER_THAN_END = 91;

    uint256 private constant OFAC_START = 92;
    uint256 private constant OFAC_END = 92;

    /**
     * @notice Retrieves the issuing state from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return A string representing the issuing state.
     */
    function getIssuingState(bytes memory charcodes) internal pure returns (string memory) {
        return extractStringAttribute(charcodes, ISSUING_STATE_START, ISSUING_STATE_END);
    }

    /**
     * @notice Retrieves and formats the name from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return A string array with the formatted name parts.
     */
    function getName(bytes memory charcodes) internal pure returns (string[] memory) {
        return Formatter.formatName(extractStringAttribute(charcodes, NAME_START, NAME_END));
    }

    /**
     * @notice Retrieves the passport number from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The passport number as a string.
     */
    function getPassportNumber(bytes memory charcodes) internal pure returns (string memory) {
        return extractStringAttribute(charcodes, ID_CARD_NUMBER_START, ID_CARD_NUMBER_END);
    }

    /**
     * @notice Retrieves the nationality from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The nationality as a string.
     */
    function getNationality(bytes memory charcodes) internal pure returns (string memory) {
        return extractStringAttribute(charcodes, NATIONALITY_START, NATIONALITY_END);
    }

    /**
     * @notice Retrieves and formats the date of birth from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The formatted date of birth as a string.
     */
    function getDateOfBirth(bytes memory charcodes) internal pure returns (string memory) {
        return Formatter.formatDate(extractStringAttribute(charcodes, DATE_OF_BIRTH_START, DATE_OF_BIRTH_END));
    }

    /**
     * @notice Retrieves the gender from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The gender as a string.
     */
    function getGender(bytes memory charcodes) internal pure returns (string memory) {
        return extractStringAttribute(charcodes, GENDER_START, GENDER_END);
    }

    /**
     * @notice Retrieves and formats the passport expiry date from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The formatted passport expiry date as a string.
     */
    function getExpiryDate(bytes memory charcodes) internal pure returns (string memory) {
        return Formatter.formatDate(extractStringAttribute(charcodes, EXPIRY_DATE_START, EXPIRY_DATE_END));
    }

    /**
     * @notice Retrieves the 'older than' age attribute from the encoded attribute byte array.
     * @dev Converts two consecutive numeric ASCII characters to a uint256.
     * @param charcodes The byte array containing passport attribute data.
     * @return The extracted age as a uint256.
     */
    function getOlderThan(bytes memory charcodes) internal pure returns (uint256) {
        return
            Formatter.numAsciiToUint(uint8(charcodes[OLDER_THAN_START])) * 10 +
            Formatter.numAsciiToUint(uint8(charcodes[OLDER_THAN_START + 1]));
    }

    /**
     * @notice Retrieves the passport number OFAC status from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The OFAC status for passport number check as a uint256.
     */
    function getPassportNoOfac(bytes memory charcodes) internal pure returns (uint256) {
        return uint8(charcodes[OFAC_START]);
    }

    /**
     * @notice Retrieves the name and date of birth OFAC status from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The OFAC status for name and DOB check as a uint256.
     */
    function getNameAndDobOfac(bytes memory charcodes) internal pure returns (uint256) {
        return uint8(charcodes[OFAC_START + 1]);
    }

    /**
     * @notice Retrieves the name and year of birth OFAC status from the encoded attribute byte array.
     * @param charcodes The byte array containing passport attribute data.
     * @return The OFAC status for name and YOB check as a uint256.
     */
    function getNameAndYobOfac(bytes memory charcodes) internal pure returns (uint256) {
        return uint8(charcodes[OFAC_START + 2]);
    }

    /**
     * @notice Performs selective OFAC checks based on provided flags.
     * @param charcodes The byte array containing passport attribute data.
     * @param checkNameAndDob Whether to check the name and date of birth OFAC status.
     * @param checkNameAndYob Whether to check the name and year of birth OFAC status.
     * @return True if all enabled checks pass (equal 1), false if any enabled check fails.
     * @dev Checks are only performed for flags that are set to true. If a flag is false,
     * that particular check is considered to have passed regardless of its actual value.
     */
    function compareOfac(
        bytes memory charcodes,
        bool checkNameAndDob,
        bool checkNameAndYob
    ) internal pure returns (bool) {
        return
            (!checkNameAndDob || getNameAndDobOfac(charcodes) == 1) &&
            (!checkNameAndYob || getNameAndYobOfac(charcodes) == 1);
    }

    /**
     * @notice Compares the extracted 'older than' value with a provided threshold.
     * @param charcodes The byte array containing passport attribute data.
     * @param olderThan The threshold value to compare against.
     * @return True if the extracted age is greater than or equal to the threshold, false otherwise.
     */
    function compareOlderThan(bytes memory charcodes, uint256 olderThan) internal pure returns (bool) {
        return getOlderThan(charcodes) >= olderThan;
    }

    /**
     * @notice Extracts a substring from a specified range in the byte array.
     * @dev Reverts with InsufficientCharcodeLen if the byte array's length is insufficient.
     * @param charcodes The byte array containing the encoded passport attribute.
     * @param start The starting index (inclusive) of the attribute in the byte array.
     * @param end The ending index (inclusive) of the attribute in the byte array.
     * @return The extracted attribute as a string.
     */
    function extractStringAttribute(
        bytes memory charcodes,
        uint256 start,
        uint256 end
    ) internal pure returns (string memory) {
        if (charcodes.length <= end) {
            revert InsufficientCharcodeLen();
        }
        bytes memory attributeBytes = new bytes(end - start + 1);
        for (uint256 i = start; i <= end; i++) {
            attributeBytes[i - start] = charcodes[i];
        }
        return string(attributeBytes);
    }
}
