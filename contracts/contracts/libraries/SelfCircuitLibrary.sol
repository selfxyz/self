// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Formatter} from "./Formatter.sol";
import {CircuitAttributeHandler} from "./CircuitAttributeHandler.sol";

/**
 * @title SelfCircuitLibrary
 * @notice A user-friendly wrapper library for handling passport verification and formatting
 * @dev This library provides simplified interfaces for common operations using CircuitAttributeHandler and Formatter
 */
library SelfCircuitLibrary {
    /**
     * @notice Represents passport attributes in a more user-friendly format
     */
    struct PassportData {
        string issuingState;
        string[] name; // [firstName, lastName]
        string passportNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
        uint256 olderThan;
        bool passportNoOfac;
        bool nameAndDobOfac;
        bool nameAndYobOfac;
    }

    /**
     * @notice Extracts and formats passport data from packed revealed data
     * @param revealedDataPacked An array of three packed uint256 values containing the passport data
     * @return PassportData struct containing all formatted passport attributes
     */
    function extractPassportData(uint256[3] memory revealedDataPacked) internal pure returns (PassportData memory) {
        bytes memory charcodes = Formatter.fieldElementsToBytes(revealedDataPacked);
        
        return PassportData({
            issuingState: CircuitAttributeHandler.getIssuingState(charcodes),
            name: CircuitAttributeHandler.getName(charcodes),
            passportNumber: CircuitAttributeHandler.getPassportNumber(charcodes),
            nationality: CircuitAttributeHandler.getNationality(charcodes),
            dateOfBirth: CircuitAttributeHandler.getDateOfBirth(charcodes),
            gender: CircuitAttributeHandler.getGender(charcodes),
            expiryDate: CircuitAttributeHandler.getExpiryDate(charcodes),
            olderThan: CircuitAttributeHandler.getOlderThan(charcodes),
            passportNoOfac: CircuitAttributeHandler.getPassportNoOfac(charcodes) == 1,
            nameAndDobOfac: CircuitAttributeHandler.getNameAndDobOfac(charcodes) == 1,
            nameAndYobOfac: CircuitAttributeHandler.getNameAndYobOfac(charcodes) == 1
        });
    }

    /**
     * @notice Checks if a passport holder meets age requirements
     * @param revealedDataPacked An array of three packed uint256 values containing the passport data
     * @param minimumAge The minimum age requirement
     * @return bool True if the passport holder is at least minimumAge years old
     */
    function meetsAgeRequirement(uint256[3] memory revealedDataPacked, uint256 minimumAge) internal pure returns (bool) {
        bytes memory charcodes = Formatter.fieldElementsToBytes(revealedDataPacked);
        return CircuitAttributeHandler.compareOlderThan(charcodes, minimumAge);
    }

    /**
     * @notice Performs OFAC checks with simplified interface
     * @param revealedDataPacked An array of three packed uint256 values containing the passport data
     * @param checkPassportNo Whether to check passport number against OFAC
     * @param checkNameAndDob Whether to check name and date of birth against OFAC
     * @param checkNameAndYob Whether to check name and year of birth against OFAC
     * @return bool True if all enabled checks pass
     */
    function performOfacChecks(
        uint256[3] memory revealedDataPacked,
        bool checkPassportNo,
        bool checkNameAndDob,
        bool checkNameAndYob
    ) internal pure returns (bool) {
        bytes memory charcodes = Formatter.fieldElementsToBytes(revealedDataPacked);
        return CircuitAttributeHandler.compareOfac(
            charcodes,
            checkPassportNo,
            checkNameAndDob,
            checkNameAndYob
        );
    }

    /**
     * @notice Converts a date string to Unix timestamp
     * @param dateString Date string in YYMMDD format
     * @return uint256 Unix timestamp
     */
    function dateToTimestamp(string memory dateString) internal pure returns (uint256) {
        return Formatter.dateToUnixTimestamp(dateString);
    }

    /**
     * @notice Formats a date string from YYMMDD to DD-MM-YY
     * @param dateString Date string in YYMMDD format
     * @return string Formatted date string in DD-MM-YY format
     */
    function formatDate(string memory dateString) internal pure returns (string memory) {
        return Formatter.formatDate(dateString);
    }

    /**
     * @notice Formats a full name string into first name and last name
     * @param fullName Full name string in "lastName<<firstName" format
     * @return string[] Array containing [firstName, lastName]
     */
    function formatName(string memory fullName) internal pure returns (string[] memory) {
        return Formatter.formatName(fullName);
    }
}
