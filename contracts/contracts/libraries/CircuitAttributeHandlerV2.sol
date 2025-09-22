// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Formatter} from "./Formatter.sol";
import {AttestationId} from "../constants/AttestationId.sol";
import {SelfStructs} from "./SelfStructs.sol";
/**
 * @title UnifiedAttributeHandler Library
 * @notice Provides functions for extracting and formatting attributes from both passport and ID card byte arrays.
 * @dev Utilizes the Formatter library for converting and formatting specific fields.
 */
library CircuitAttributeHandlerV2 {
    /**
     * @dev Reverts when the provided character codes array does not contain enough data to extract an attribute.
     */
    error InsufficientCharcodeLen();

    /**
     * @notice Structure containing field positions for a specific attestation type.
     */
    struct FieldPositions {
        uint256 issuingStateStart;
        uint256 issuingStateEnd;
        uint256 nameStart;
        uint256 nameEnd;
        uint256 documentNumberStart;
        uint256 documentNumberEnd;
        uint256 nationalityStart;
        uint256 nationalityEnd;
        uint256 dateOfBirthStart;
        uint256 dateOfBirthEnd;
        uint256 genderStart;
        uint256 genderEnd;
        uint256 expiryDateStart;
        uint256 expiryDateEnd;
        uint256 olderThanStart;
        uint256 olderThanEnd;
        uint256 ofacStart;
        uint256 ofacEnd;
    }

    /**
     * @notice Returns the field positions for a given attestation type.
     * @param attestationId The attestation identifier.
     * @return positions The FieldPositions struct containing all relevant positions.
     */
    function getFieldPositions(bytes32 attestationId) internal pure returns (FieldPositions memory positions) {
        if (attestationId == AttestationId.E_PASSPORT) {
            return
                FieldPositions({
                    issuingStateStart: 2,
                    issuingStateEnd: 4,
                    nameStart: 5,
                    nameEnd: 43,
                    documentNumberStart: 44,
                    documentNumberEnd: 52,
                    nationalityStart: 54,
                    nationalityEnd: 56,
                    dateOfBirthStart: 57,
                    dateOfBirthEnd: 62,
                    genderStart: 64,
                    genderEnd: 64,
                    expiryDateStart: 65,
                    expiryDateEnd: 70,
                    olderThanStart: 88,
                    olderThanEnd: 89,
                    ofacStart: 90,
                    ofacEnd: 92
                });
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            return
                FieldPositions({
                    issuingStateStart: 2,
                    issuingStateEnd: 4,
                    nameStart: 60,
                    nameEnd: 89,
                    documentNumberStart: 5,
                    documentNumberEnd: 13,
                    nationalityStart: 45,
                    nationalityEnd: 47,
                    dateOfBirthStart: 30,
                    dateOfBirthEnd: 35,
                    genderStart: 37,
                    genderEnd: 37,
                    expiryDateStart: 38,
                    expiryDateEnd: 43,
                    olderThanStart: 90,
                    olderThanEnd: 91,
                    ofacStart: 92,
                    ofacEnd: 93
                });
        } else if (attestationId == AttestationId.AADHAAR) {
            return
                FieldPositions({
                    issuingStateStart: 81,
                    issuingStateEnd: 111,
                    nameStart: 9,
                    nameEnd: 70,
                    documentNumberStart: 71,
                    documentNumberEnd: 74,
                    nationalityStart: 999,
                    nationalityEnd: 999,
                    dateOfBirthStart: 1,
                    dateOfBirthEnd: 8,
                    genderStart: 0,
                    genderEnd: 0,
                    expiryDateStart: 999,
                    expiryDateEnd: 999,
                    olderThanStart: 118,
                    olderThanEnd: 118,
                    ofacStart: 116,
                    ofacEnd: 117
                });
        } else {
            revert("Invalid attestation ID");
        }
    }

    /**
     * @notice Retrieves the issuing state from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return A string representing the issuing state.
     */
    function getIssuingState(bytes32 attestationId, bytes memory charcodes) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return extractStringAttribute(charcodes, positions.issuingStateStart, positions.issuingStateEnd);
    }

    /**
     * @notice Retrieves and formats the name from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return A string array with the formatted name parts.
     */
    function getName(bytes32 attestationId, bytes memory charcodes) internal pure returns (string[] memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        if (attestationId == AttestationId.AADHAAR) {
            string memory fullName = extractStringAttribute(charcodes, positions.nameStart, positions.nameEnd);
            string[] memory nameParts = new string[](2);
            nameParts[0] = fullName;
            return nameParts;
        }
        return Formatter.formatName(extractStringAttribute(charcodes, positions.nameStart, positions.nameEnd));
    }

    /**
     * @notice Retrieves the document number from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The document number as a string.
     */
    function getDocumentNumber(bytes32 attestationId, bytes memory charcodes) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return extractStringAttribute(charcodes, positions.documentNumberStart, positions.documentNumberEnd);
    }

    /**
     * @notice Retrieves the nationality from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The nationality as a string.
     */
    function getNationality(bytes32 attestationId, bytes memory charcodes) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return extractStringAttribute(charcodes, positions.nationalityStart, positions.nationalityEnd);
    }

    /**
     * @notice Retrieves and formats the date of birth from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The formatted date of birth as a string.
     */
    function getDateOfBirth(bytes32 attestationId, bytes memory charcodes) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return
            Formatter.formatDate(
                extractStringAttribute(charcodes, positions.dateOfBirthStart, positions.dateOfBirthEnd)
            );
    }

    function getDateOfBirthFullYear(
        bytes32 attestationId,
        bytes memory charcodes
    ) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return
            Formatter.formatDateFullYear(
                extractStringAttribute(charcodes, positions.dateOfBirthStart, positions.dateOfBirthEnd)
            );
    }

    /**
     * @notice Retrieves the gender from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The gender as a string.
     */
    function getGender(bytes32 attestationId, bytes memory charcodes) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return extractStringAttribute(charcodes, positions.genderStart, positions.genderEnd);
    }

    /**
     * @notice Retrieves and formats the expiry date from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The formatted expiry date as a string.
     */
    function getExpiryDate(bytes32 attestationId, bytes memory charcodes) internal pure returns (string memory) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return
            Formatter.formatDate(extractStringAttribute(charcodes, positions.expiryDateStart, positions.expiryDateEnd));
    }

    /**
     * @notice Retrieves the 'older than' age attribute from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The extracted age as a uint256.
     */
    function getOlderThan(bytes32 attestationId, bytes memory charcodes) internal pure returns (uint256) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return
            Formatter.numAsciiToUint(uint8(charcodes[positions.olderThanStart])) * 10 +
            Formatter.numAsciiToUint(uint8(charcodes[positions.olderThanStart + 1]));
    }

    /**
     * @notice Retrieves the document number OFAC status from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The OFAC status for document number check as a uint256.
     */
    function getDocumentNoOfac(bytes32 attestationId, bytes memory charcodes) internal pure returns (bool) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        return uint8(charcodes[positions.ofacStart]) == 1;
    }

    /**
     * @notice Retrieves the name and date of birth OFAC status from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The OFAC status for name and DOB check as a uint256.
     */
    function getNameAndDobOfac(bytes32 attestationId, bytes memory charcodes) internal pure returns (bool) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        if (attestationId == AttestationId.E_PASSPORT) {
            return uint8(charcodes[positions.ofacStart + 1]) == 1;
        } else {
            return uint8(charcodes[positions.ofacStart]) == 1;
        }
    }

    /**
     * @notice Retrieves the name and year of birth OFAC status from the encoded attribute byte array.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @return The OFAC status for name and YOB check as a uint256.
     */
    function getNameAndYobOfac(bytes32 attestationId, bytes memory charcodes) internal pure returns (bool) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        if (attestationId == AttestationId.E_PASSPORT) {
            return uint8(charcodes[positions.ofacStart + 2]) == 1;
        } else {
            return uint8(charcodes[positions.ofacStart + 1]) == 1;
        }
    }

    /**
     * @notice Performs selective OFAC checks based on provided flags.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @param checkDocumentNo Whether to check the document number OFAC status.
     * @param checkNameAndDob Whether to check the name and date of birth OFAC status.
     * @param checkNameAndYob Whether to check the name and year of birth OFAC status.
     * @return True if all enabled checks pass (equal 1), false if any enabled check fails.
     */
    function compareOfac(
        bytes32 attestationId,
        bytes memory charcodes,
        bool checkDocumentNo,
        bool checkNameAndDob,
        bool checkNameAndYob
    ) internal pure returns (bool) {
        bool documentNoResult = true; // Default to true (no violation) if not checking
        bool nameAndDobResult = true; // Default to true (no violation) if not checking
        bool nameAndYobResult = true; // Default to true (no violation) if not checking

        if (checkDocumentNo && attestationId == AttestationId.E_PASSPORT) {
            documentNoResult = getDocumentNoOfac(attestationId, charcodes);
        }

        if (checkNameAndDob) {
            nameAndDobResult = getNameAndDobOfac(attestationId, charcodes);
        }

        if (checkNameAndYob) {
            nameAndYobResult = getNameAndYobOfac(attestationId, charcodes);
        }

        // Return true if all enabled checks indicate no OFAC violations (all return true)
        return documentNoResult && nameAndDobResult && nameAndYobResult;
    }

    /**
     * @notice Compares the extracted 'older than' value with a provided threshold.
     * @param attestationId The attestation identifier.
     * @param charcodes The byte array containing attribute data.
     * @param olderThan The threshold value to compare against.
     * @return True if the extracted age is greater than or equal to the threshold, false otherwise.
     */
    function compareOlderThan(
        bytes32 attestationId,
        bytes memory charcodes,
        uint256 olderThan
    ) internal pure returns (bool) {
        return getOlderThan(attestationId, charcodes) >= olderThan;
    }

    function compareOlderThanNumeric(
        bytes32 attestationId,
        bytes memory charcodes,
        uint256 olderThan
    ) internal pure returns (bool) {
        FieldPositions memory positions = getFieldPositions(attestationId);
        uint256 extractedAge = uint8(charcodes[positions.olderThanStart]);
        return extractedAge >= olderThan;
    }

    /**
     * @notice Extracts a substring from a specified range in the byte array.
     * @param charcodes The byte array containing the encoded attribute.
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

    // ====================================================
    // Legacy Functions (for backward compatibility)
    // ====================================================

    /**
     * @notice Legacy function for passport number extraction.
     * @dev Maintained for backward compatibility. Use getDocumentNumber instead.
     */
    function getPassportNumber(bytes memory charcodes) internal pure returns (string memory) {
        return getDocumentNumber(AttestationId.E_PASSPORT, charcodes);
    }

    /**
     * @notice Legacy function for passport OFAC check.
     * @dev Maintained for backward compatibility. Use getDocumentNoOfac instead.
     */
    function getPassportNoOfac(bytes memory charcodes) internal pure returns (uint256) {
        return getDocumentNoOfac(AttestationId.E_PASSPORT, charcodes) ? 1 : 0;
    }
}
