// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title SelfStructs
 * @dev Library containing data structures for Self protocol identity verification
 * @notice Defines structs for passport verification, EU ID verification, and generic disclosure outputs
 */
library SelfStructs {
    /**
     * @dev Header structure for Hub input containing contract version and scope information
     * @param contractVersion Version of the contract being used
     * @param scope Scope identifier for the verification request
     * @param attestationId Unique identifier for the attestation
     */
    struct HubInputHeader {
        uint8 contractVersion;
        uint256 scope;
        bytes32 attestationId;
    }

    /**
     * @dev Output structure for passport verification results
     * @param attestationId Unique identifier for the attestation
     * @param revealedDataPacked Packed binary data of revealed information
     * @param userIdentifier Unique identifier for the user
     * @param nullifier Cryptographic nullifier to prevent double-spending
     * @param forbiddenCountriesListPacked Packed list of forbidden countries (4 uint256 array)
     */
    struct PassportOutput {
        uint256 attestationId;
        bytes revealedDataPacked;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256[4] forbiddenCountriesListPacked;
    }

    /**
     * @dev Output structure for EU ID verification results
     * @param attestationId Unique identifier for the attestation
     * @param revealedDataPacked Packed binary data of revealed information
     * @param userIdentifier Unique identifier for the user
     * @param nullifier Cryptographic nullifier to prevent double-spending
     * @param forbiddenCountriesListPacked Packed list of forbidden countries (4 uint256 array)
     */
    struct EuIdOutput {
        uint256 attestationId;
        bytes revealedDataPacked;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256[4] forbiddenCountriesListPacked;
    }

    /**
     * @dev Output structure for Aadhaar verification results
     * @param attestationId Unique identifier for the attestation
     * @param revealedDataPacked Packed binary data of revealed information
     * @param userIdentifier Unique identifier for the user
     * @param nullifier Cryptographic nullifier to prevent double-spending
     */
    struct AadhaarOutput {
        uint256 attestationId;
        bytes revealedDataPacked;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256[4] forbiddenCountriesListPacked;
    }

    /// @dev OFAC verification mode: Passport number only
    uint256 constant passportNoOfac = 0;
    /// @dev OFAC verification mode: Name and date of birth
    uint256 constant nameAndDobOfac = 1;
    /// @dev OFAC verification mode: Name and year of birth
    uint256 constant nameAndYobOfac = 2;

    /**
     * @dev Generic disclosure output structure (Version 2) with detailed personal information
     * @param attestationId Unique identifier for the attestation
     * @param userIdentifier Unique identifier for the user
     * @param nullifier Cryptographic nullifier to prevent double-spending
     * @param forbiddenCountriesListPacked Packed list of forbidden countries (4 uint256 array)
     * @param issuingState Country or state that issued the document
     * @param name Array of name components (first, middle, last names)
     * @param idNumber Government-issued identification number
     * @param nationality Nationality of the document holder
     * @param dateOfBirth Date of birth in string format
     * @param gender Gender of the document holder
     * @param expiryDate Document expiration date in string format
     * @param olderThan Minimum age verification result
     * @param ofac Array of OFAC (Office of Foreign Assets Control) verification results for different modes
     */
    struct GenericDiscloseOutputV2 {
        bytes32 attestationId;
        uint256 userIdentifier;
        uint256 nullifier;
        uint256[4] forbiddenCountriesListPacked;
        string issuingState;
        string[] name;
        string idNumber;
        string nationality;
        string dateOfBirth;
        string gender;
        string expiryDate;
        uint256 olderThan;
        bool[3] ofac;
    }

    /**
     * @dev Verification configuration structure (Version 1)
     * @param olderThanEnabled Whether minimum age verification is enabled
     * @param olderThan Minimum age requirement
     * @param forbiddenCountriesEnabled Whether forbidden countries check is enabled
     * @param forbiddenCountriesListPacked Packed list of forbidden countries (4 uint256 array)
     * @param ofacEnabled Array of boolean flags for different OFAC verification modes
     */
    struct VerificationConfigV1 {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256[4] forbiddenCountriesListPacked;
        bool[3] ofacEnabled;
    }

    /**
     * @dev Verification configuration structure (Version 2)
     * @param olderThanEnabled Whether minimum age verification is enabled
     * @param olderThan Minimum age requirement
     * @param forbiddenCountriesEnabled Whether forbidden countries check is enabled
     * @param forbiddenCountriesListPacked Packed list of forbidden countries (4 uint256 array)
     * @param ofacEnabled Array of boolean flags for different OFAC verification modes
     */
    struct VerificationConfigV2 {
        bool olderThanEnabled;
        uint256 olderThan;
        bool forbiddenCountriesEnabled;
        uint256[4] forbiddenCountriesListPacked;
        bool[3] ofacEnabled;
    }
}
