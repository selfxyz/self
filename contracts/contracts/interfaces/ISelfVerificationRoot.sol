// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title ISelfVerificationRoot
 * @notice Interface for self-verification infrastructure integration
 * @dev Provides base functionality for verifying and disclosing identity credentials
 */
interface ISelfVerificationRoot {
    /**
     * @notice Structure containing proof data for disclose circuits
     * @dev Contains the proof elements required for zero-knowledge verification
     * @param a First proof element
     * @param b Second proof element (2x2 matrix)
     * @param c Third proof element
     * @param pubSignals Array of 21 public signals for the circuit
     */
    struct DiscloseCircuitProof {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
        uint256[21] pubSignals;
    }

    /**
     * @notice Structure containing verified identity disclosure output data
     * @dev Contains all disclosed identity information after successful verification
     * @param attestationId Unique identifier for the identity documents
     * @param userIdentifier Unique identifier for the user
     * @param nullifier Unique nullifier to prevent double-spending
     * @param forbiddenCountriesListPacked Packed representation of forbidden countries list
     * @param issuingState The state/country that issued the identity document
     * @param name Array of name components
     * @param idNumber The identity document number
     * @param nationality The nationality of the document holder
     * @param dateOfBirth Date of birth in string format
     * @param gender Gender of the document holder
     * @param expiryDate Expiry date of the identity document
     * @param olderThan Verified age threshold (e.g., 18 for adult verification)
     * @param ofac Array of OFAC (Office of Foreign Assets Control) compliance flags
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
     * @notice Verifies a self-proof using the bytes-based interface
     * @dev Parses relayer data format and validates against contract settings before calling hub V2
     * @param proofPayload Packed data from relayer in format: | 32 bytes attestationId | proof data |
     * @param userContextData User-defined data in format: | 32 bytes configId | 32 bytes destChainId | 32 bytes userIdentifier | data |
     */
    function verifySelfProof(bytes calldata proofPayload, bytes calldata userContextData) external;

    /**
     * @notice Callback function called upon successful verification
     * @dev Only the identity verification hub V2 contract should call this function
     * @param output The verification output data containing disclosed identity information
     * @param userData The user-defined data passed through the verification process
     */
    function onVerificationSuccess(bytes memory output, bytes memory userData) external;
}
