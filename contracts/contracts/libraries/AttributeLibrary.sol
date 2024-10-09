// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

library AttributeLibrary {

    error INSUFFICIENT_CHARCODE_LEN();

    // Define constant start and end positions for each attribute
    uint256 private constant ISSUING_STATE_START = 2;
    uint256 private constant ISSUING_STATE_END = 4;

    uint256 private constant NAME_START = 5;
    uint256 private constant NAME_END = 43;

    uint256 private constant PASSPORT_NUMBER_START = 44;
    uint256 private constant PASSPORT_NUMBER_END = 52;

    uint256 private constant NATIONALITY_START = 54;
    uint256 private constant NATIONALITY_END = 56;

    uint256 private constant DATE_OF_BIRTH_START = 57;
    uint256 private constant DATE_OF_BIRTH_END = 62;

    uint256 private constant GENDER_START = 64;
    uint256 private constant GENDER_END = 64;

    uint256 private constant EXPIRY_DATE_START = 65;
    uint256 private constant EXPIRY_DATE_END = 70;

    uint256 private constant OLDER_THAN_START = 88;
    uint256 private constant OLDER_THAN_END = 89;

    /**
     * @notice Extracts the issuing state from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The issuing state as a string.
     */
    function getIssuingState(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, ISSUING_STATE_START, ISSUING_STATE_END);
    }

    /**
     * @notice Extracts the name from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The name as a string.
     */
    function getName(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, NAME_START, NAME_END);
    }

    /**
     * @notice Extracts the passport number from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The passport number as a string.
     */
    function getPassportNumber(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, PASSPORT_NUMBER_START, PASSPORT_NUMBER_END);
    }

    /**
     * @notice Extracts the nationality from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The nationality as a string.
     */
    function getNationality(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, NATIONALITY_START, NATIONALITY_END);
    }

    /**
     * @notice Extracts the date of birth from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The date of birth as a string.
     */
    function getDateOfBirth(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, DATE_OF_BIRTH_START, DATE_OF_BIRTH_END);
    }

    /**
     * @notice Extracts the gender from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The gender as a string.
     */
    function getGender(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, GENDER_START, GENDER_END);
    }

    /**
     * @notice Extracts the expiry date from the charcodes.
     * @param charcodes The bytes array containing packed attribute data.
     * @return The expiry date as a string.
     */
    function getExpiryDate(bytes memory charcodes) internal pure returns (string memory) {
        return extractAttribute(charcodes, EXPIRY_DATE_START, EXPIRY_DATE_END);
    }

    /**
     * @notice Extracts a substring from the charcodes based on start and end indices.
     * @param charcodes The bytes array containing packed attribute data.
     * @param start The starting index (inclusive).
     * @param end The ending index (inclusive).
     * @return The extracted substring as a string.
     */
    function extractAttribute(bytes memory charcodes, uint256 start, uint256 end) internal pure returns (string memory) {
        if (charcodes.length <= end) {
            revert INSUFFICIENT_CHARCODE_LEN();
        }
        bytes memory attributeBytes = new bytes(end - start + 1);
        for (uint256 i = start; i <= end; i++) {
            attributeBytes[i - start] = charcodes[i];
        }
        return string(attributeBytes);
    }
}