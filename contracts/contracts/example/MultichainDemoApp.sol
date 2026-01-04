// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

/**
 * @title MultichainDemoApp
 * @notice Demo dApp for multichain verification testing (Celo → Base via LayerZero)
 * @dev Receives bridged verification data, decodes nationality, stores message, and tracks timing
 */
contract MultichainDemoApp is ISelfVerificationRoot {
    /// @notice Structure to store verification data
    struct Verification {
        address sender;
        string nationality;
        string message;
        uint256 timestamp;
        uint256 userIdentifier;
    }

    /// @notice Emitted when a verification is received via bridge
    event VerificationReceived(
        address indexed sender,
        string nationality,
        string message,
        uint256 timestamp,
        uint256 userIdentifier
    );

    /// @notice Unique scope for this demo dApp
    uint256 public constant SCOPE = 98765;

    /// @notice Array of all verifications received
    Verification[] public verifications;

    /// @notice Mapping from user identifier to their last verification
    mapping(uint256 => Verification) public userVerifications;

    /// @notice Returns the scope of this dApp
    function scope() external pure returns (uint256) {
        return SCOPE;
    }

    /**
     * @notice Direct proof verification is not supported for multichain dApps
     * @dev Multichain dApps receive callbacks via onVerificationSuccess from the MultichainHub
     */
    function verifySelfProof(
        bytes calldata /* proofPayload */,
        bytes calldata /* userContextData */
    ) external pure override {
        revert("MultichainDemoApp: use multichain flow, not verifySelfProof()");
    }

    /**
     * @notice Callback from MultichainHub when verification is bridged from source chain
     * @param output ABI-encoded GenericDiscloseOutputV2 containing disclosed identity data
     * @param userData User-defined data passed through the bridge (e.g., "Bridge Test")
     */
    function onVerificationSuccess(
        bytes memory output,
        bytes memory userData
    ) external override {
        // Decode the output to get nationality and user identifier
        GenericDiscloseOutputV2 memory decoded = abi.decode(
            output,
            (GenericDiscloseOutputV2)
        );

        // Convert userData bytes to string
        string memory message = string(userData);

        // Create verification record
        Verification memory verification = Verification({
            sender: msg.sender,
            nationality: decoded.nationality,
            message: message,
            timestamp: block.timestamp,
            userIdentifier: decoded.userIdentifier
        });

        // Store in array
        verifications.push(verification);

        // Store by user identifier for easy lookup
        userVerifications[decoded.userIdentifier] = verification;

        // Emit event with all details
        emit VerificationReceived(
            msg.sender,
            decoded.nationality,
            message,
            block.timestamp,
            decoded.userIdentifier
        );
    }

    /**
     * @notice Get the total number of verifications received
     * @return The count of verifications
     */
    function getVerificationCount() external view returns (uint256) {
        return verifications.length;
    }

    /**
     * @notice Get the most recent verification
     * @return The last verification received
     */
    function getLastVerification() external view returns (Verification memory) {
        require(verifications.length > 0, "No verifications yet");
        return verifications[verifications.length - 1];
    }

    /**
     * @notice Get all verifications
     * @return Array of all verifications
     */
    function getAllVerifications() external view returns (Verification[] memory) {
        return verifications;
    }

    /**
     * @notice Get verification by index
     * @param index The index of the verification
     * @return The verification at the given index
     */
    function getVerification(uint256 index) external view returns (Verification memory) {
        require(index < verifications.length, "Index out of bounds");
        return verifications[index];
    }

    /**
     * @notice Get verification for a specific user
     * @param userIdentifier The user's identifier from disclosure proof
     * @return The user's verification data
     */
    function getUserVerification(uint256 userIdentifier) external view returns (Verification memory) {
        return userVerifications[userIdentifier];
    }

    /**
     * @notice Check if a user has been verified
     * @param userIdentifier The user's identifier
     * @return True if user has a verification record
     */
    function isUserVerified(uint256 userIdentifier) external view returns (bool) {
        return userVerifications[userIdentifier].timestamp > 0;
    }
}


