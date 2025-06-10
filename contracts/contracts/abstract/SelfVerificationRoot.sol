// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IIdentityVerificationHubV2} from "../interfaces/IIdentityVerificationHubV2.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {CircuitConstantsV2} from "../constants/CircuitConstantsV2.sol";
import {AttestationId} from "../constants/AttestationId.sol";

/**
 * @title SelfVerificationRoot
 * @notice Abstract base contract to be integrated with self's verification infrastructure
 * @dev Provides base functionality for verifying and disclosing identity credentials
 */
abstract contract SelfVerificationRoot is ISelfVerificationRoot {
    // ====================================================
    // Constants
    // ====================================================

    uint256 constant E_PASSPORT_REVEALED_DATA_LENGTH = 3;
    uint256 constant EU_ID_CARD_REVEALED_DATA_LENGTH = 4;

    uint8 constant CONTRACT_VERSION = 2;

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice The scope value that proofs must match
    /// @dev Used to validate that submitted proofs match the expected scope
    uint256 internal _scope;

    /// @notice Reference to the identity verification hub V2 contract
    /// @dev Immutable reference used for bytes-based proof verification
    IIdentityVerificationHubV2 internal immutable _identityVerificationHubV2;

    /// @notice Mapping from requestId to stored calldata for deferred execution
    /// @dev Used to store calldata that will be executed after successful verification
    mapping(bytes32 => bytes) internal _requestIdToCalldata;

    /// @notice Mapping to track if a requestId has been used/executed
    /// @dev Prevents replay attacks and ensures one-time execution per requestId
    mapping(bytes32 => bool) internal _requestIdExecuted;

    // ====================================================
    // Circuit Constants
    // ====================================================

    // Register circuit constants remain the same
    uint256 internal constant REGISTER_NULLIFIER_INDEX = CircuitConstantsV2.REGISTER_NULLIFIER_INDEX;
    uint256 internal constant REGISTER_COMMITMENT_INDEX = CircuitConstantsV2.REGISTER_COMMITMENT_INDEX;
    uint256 internal constant REGISTER_MERKLE_ROOT_INDEX = CircuitConstantsV2.REGISTER_MERKLE_ROOT_INDEX;

    // DSC circuit constants remain the same
    uint256 internal constant DSC_TREE_LEAF_INDEX = CircuitConstantsV2.DSC_TREE_LEAF_INDEX;
    uint256 internal constant DSC_CSCA_ROOT_INDEX = CircuitConstantsV2.DSC_CSCA_ROOT_INDEX;

    // Note: VC and Disclose constants are now dynamic and obtained via getDiscloseIndices()
    // These are no longer available as compile-time constants but can be accessed at runtime

    // ====================================================
    // Attestation ID
    // ====================================================

    bytes32 constant E_PASSPORT_ID = AttestationId.E_PASSPORT;

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Error thrown when the proof's scope doesn't match the expected scope
    /// @dev Triggered in verifySelfProof when scope validation fails
    error InvalidScope();

    /// @notice Error thrown when the proof's attestation ID doesn't match the expected ID
    /// @dev Triggered in verifySelfProof when attestation ID validation fails
    error InvalidAttestationId();

    /// @notice Error thrown when the contract version doesn't match
    /// @dev Triggered in verifySelfProof when contract version validation fails
    error InvalidContractVersion();

    /// @notice Error thrown when the data format is invalid
    /// @dev Triggered when the provided bytes data doesn't have the expected format
    error InvalidDataFormat();

    /// @notice Error thrown when a requestId has already been executed
    /// @dev Prevents replay attacks
    error RequestIdAlreadyExecuted();

    /// @notice Error thrown when no calldata is stored for a given requestId
    /// @dev Triggered when trying to execute a requestId that doesn't exist
    error NoCalldataStored();

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the verification is successful
    event VerificationSuccess(
        uint256 indexed scope,
        bytes32 indexed attestationId,
        uint256 indexed nullifier,
        uint256 userIdentifier,
        uint256[] revealedDataPacked
    );

    /// @notice Emitted when the scope is updated
    event ScopeUpdated(uint256 indexed newScope);

    /// @notice Emitted when a new attestation ID is added
    event AttestationIdAdded(bytes32 indexed attestationId);

    /// @notice Emitted when an attestation ID is removed
    event AttestationIdRemoved(bytes32 indexed attestationId);

    /// @notice Emitted when calldata is stored for a requestId
    event CalldataStored(bytes32 indexed requestId, bytes calldata);

    /// @notice Emitted when calldata is executed for a requestId
    event CalldataExecuted(bytes32 indexed requestId, bool success, bytes result);

    /**
     * @notice Initializes the SelfVerificationRoot contract.
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2.
     * @param scopeValue The expected proof scope for user registration.
     */
    constructor(
        address identityVerificationHubV2Address,
        uint256 scopeValue
    ) {
        _identityVerificationHubV2 = IIdentityVerificationHubV2(identityVerificationHubV2Address);
        _scope = scopeValue;
    }

    /**
     * @notice Updates the scope value
     * @dev Used to change the expected scope for proofs
     * @param newScope The new scope value to set
     */
    function _setScope(uint256 newScope) internal {
        _scope = newScope;
        emit ScopeUpdated(newScope);
    }

    /**
     * @notice Verifies a self-proof using the bytes-based interface
     * @dev Parses relayer data format and validates against contract settings before calling hub V2
     * @param teeData Packed data from relayer in format: | 32 bytes attestationId | proof data |
     * @param userDefinedData User-defined data in format: | 32 bytes requestId | 32 bytes configId | 32 bytes destChainId | calldata |
     */
    /*
        - Extract requestId from userDefinedData
        - Store requestId => calldata mapping
        - Do scope verification
        - Encode contractVersion
        - Call verify function in the Hub contract
        - Call onVerificationSuccess

        teeData = | 32 bytes attestationId | 32 bytes configId | 32 bytes destChainId | proofData |
        userDefinedData
        hubData = | 1 bytes contract version | 31 bytes buffer | 32 bytes attestationId | bytes32 configId | 32 bytes destChainId | proofData |
     */
    function verifySelfProof(
        bytes calldata teeData,
        bytes calldata userDefinedData
    ) public {
        // Minimum expected length for teeData: 32 bytes attestationId + proof data
        if (teeData.length < 32) {
            revert InvalidDataFormat();
        }

        // Minimum userDefinedData length: 32 (requestId) + 32 (configId) + 32 (destChainId) = 96 bytes
        if (userDefinedData.length < 96) {
            revert InvalidDataFormat();
        }

        // Extract requestId, configId, destChainId from userDefinedData
        bytes32 requestId;
        bytes32 configId;
        bytes32 destChainId;

        assembly {
            requestId := calldataload(userDefinedData.offset)
            configId := calldataload(add(userDefinedData.offset, 32))
            destChainId := calldataload(add(userDefinedData.offset, 64))
        }

        // Check if requestId has already been executed
        if (_requestIdExecuted[requestId]) {
            revert RequestIdAlreadyExecuted();
        }

        // Store calldata for later execution (if any calldata exists beyond the 96 bytes)
        if (userDefinedData.length > 96) {
            bytes calldata calldataToStore = userDefinedData[96:];
            _requestIdToCalldata[requestId] = calldataToStore;
            emit CalldataStored(requestId, calldataToStore);
        }

        bytes32 attestationId;
        assembly {
            // Load attestationId from the beginning of teeData (first 32 bytes)
            attestationId := calldataload(teeData.offset)
        }

        // Hub data should be | 1 byte contractVersion | 31 bytes buffer | 32 bytes destChainId | 32 bytes configId | 32 bytes attestationId | proof data
        bytes memory hubData = abi.encodePacked(
            // 1 byte contractVersion
            CONTRACT_VERSION,
            // 31 bytes buffer (all zeros)
            bytes31(0),
            // 32 bytes destChainId
            destChainId,
            // 32 bytes configId
            configId,
            // 32 bytes attestationId
            attestationId,
            // proof data (starts after 32 bytes attestationId)
            teeData[32:]
        );

        // Call hub V2 verification
        bytes memory result = _identityVerificationHubV2.verifyVcAndDisclose(hubData);

        // Decode the result to extract all verification data
        // Note: Result format depends on attestation type (passport vs ID card)
        uint256 userIdentifier;
        uint256 nullifier;
        uint256 scope;
        uint256 identityCommitmentRoot;
        uint256[] memory revealedDataPacked;
        uint256[4] memory forbiddenCountriesListPacked;

        if (attestationId == AttestationId.E_PASSPORT) {
            IIdentityVerificationHubV2.VcAndDiscloseVerificationResult memory passportResult = abi.decode(
                result,
                (IIdentityVerificationHubV2.VcAndDiscloseVerificationResult)
            );

            // Copy passport data using a for loop
            revealedDataPacked = new uint256[](E_PASSPORT_REVEALED_DATA_LENGTH);
            for (uint256 i = 0; i < E_PASSPORT_REVEALED_DATA_LENGTH; i++) {
                revealedDataPacked[i] = passportResult.revealedDataPacked[i];
            }

            userIdentifier = passportResult.userIdentifier;
            nullifier = passportResult.nullifier;
            scope = passportResult.scope;
            identityCommitmentRoot = passportResult.identityCommitmentRoot;
            forbiddenCountriesListPacked = passportResult.forbiddenCountriesListPacked;
        } else if (attestationId == AttestationId.EU_ID_CARD) {
            IIdentityVerificationHubV2.IdCardVcAndDiscloseVerificationResult memory idCardResult = abi.decode(
                result,
                (IIdentityVerificationHubV2.IdCardVcAndDiscloseVerificationResult)
            );

            // Copy ID card data using a for loop
            revealedDataPacked = new uint256[](EU_ID_CARD_REVEALED_DATA_LENGTH);
            for (uint256 i = 0; i < EU_ID_CARD_REVEALED_DATA_LENGTH; i++) {
                revealedDataPacked[i] = idCardResult.revealedDataPacked[i];
            }

            userIdentifier = idCardResult.userIdentifier;
            nullifier = idCardResult.nullifier;
            scope = idCardResult.scope;
            identityCommitmentRoot = idCardResult.identityCommitmentRoot;
            forbiddenCountriesListPacked = idCardResult.forbiddenCountriesListPacked;
        } else {
            revert InvalidAttestationId();
        }

        // Validate scope against our stored scope
        if (scope != _scope) {
            revert InvalidScope();
        }

        emit VerificationSuccess(scope, attestationId, nullifier, userIdentifier, revealedDataPacked);

        // Call onVerificationSuccess with the verification data and requestId
        bytes memory verificationData = abi.encode(
            attestationId,
            scope,
            userIdentifier,
            nullifier,
            identityCommitmentRoot,
            revealedDataPacked,
            forbiddenCountriesListPacked
        );

        // Pass requestId, configId, destChainId in userDefinedData for onVerificationSuccess
        bytes memory modifiedUserDefinedData = abi.encodePacked(requestId, configId, destChainId);
        onVerificationSuccess(verificationData, modifiedUserDefinedData);
    }

    /**
     * @notice Hook called after successful verification with requestId-based execution
     * @dev Virtual function that can be overridden by derived contracts
     * @param verificationData The encoded verification data (attestationId, scope, userIdentifier, nullifier, identityCommitmentRoot, revealedDataPacked, forbiddenCountriesListPacked)
     * @param userDefinedData User-defined data containing requestId, configId, destChainId
     */
    function onVerificationSuccess(
        bytes memory verificationData,
        bytes calldata userDefinedData
    ) public virtual {
        // Extract requestId from userDefinedData
        if (userDefinedData.length < 32) {
            return; // No requestId provided
        }

        bytes32 requestId;
        assembly {
            requestId := calldataload(userDefinedData.offset)
        }

        // Execute stored calldata for this requestId
        _executeStoredCalldata(requestId, verificationData, userDefinedData);
    }

    /**
     * @notice Executes stored calldata for a given requestId
     * @dev Internal function that retrieves and executes the stored calldata
     * @param requestId The request identifier
     * @param verificationData The verification data to pass to the executed function
     * @param userDefinedData The user-defined data containing requestId, configId, destChainId
     */
    function _executeStoredCalldata(
        bytes32 requestId,
        bytes memory verificationData,
        bytes calldata userDefinedData
    ) internal {
        // Check if requestId has already been executed
        if (_requestIdExecuted[requestId]) {
            revert RequestIdAlreadyExecuted();
        }

        // Get stored calldata
        bytes memory storedCalldata = _requestIdToCalldata[requestId];
        if (storedCalldata.length == 0) {
            // No calldata to execute, just return
            return;
        }

        // Mark as executed to prevent replay
        _requestIdExecuted[requestId] = true;

        // Execute the stored calldata
        // The stored calldata should contain the function selector and any additional parameters
        // We'll prepend the verificationData and userDefinedData to the call
        bytes memory fullCalldata = abi.encodePacked(
            storedCalldata,
            verificationData,
            userDefinedData
        );

        // Make the call to this contract
        (bool success, bytes memory result) = address(this).call(fullCalldata);

        emit CalldataExecuted(requestId, success, result);

        if (!success) {
            // Handle call failure - could emit an event or revert based on requirements
            // For now, we'll continue silently (can be customized by derived contracts)
            return;
        }
    }

    /**
     * @notice Dispatches function calls based on function selector
     * @dev Can be overridden by derived contracts to implement custom function routing
     * @param functionSelector The 4-byte function selector
     * @param verificationData The encoded verification data
     * @param userDefinedData The complete user-defined data
     */
    function _dispatchFunction(
        bytes4 functionSelector,
        bytes memory verificationData,
        bytes calldata userDefinedData
    ) internal virtual {
        // This function is now less relevant since we're using stored calldata execution
        // But keeping it for backward compatibility and potential custom implementations

        if (userDefinedData.length < 96) {
            return; // Insufficient data
        }

        bytes32 requestId;
        bytes32 configId;
        bytes32 destChainId;

        assembly {
            requestId := calldataload(userDefinedData.offset)
            configId := calldataload(add(userDefinedData.offset, 32))
            destChainId := calldataload(add(userDefinedData.offset, 64))
        }

        // Prepare the call data with the function selector and all parameters
        bytes memory callData = abi.encodePacked(
            functionSelector,
            verificationData,
            requestId,
            configId,
            destChainId
        );

        // Make the call to this contract
        (bool success, bytes memory result) = address(this).call(callData);

        if (!success) {
            // Handle call failure - could emit an event or revert based on requirements
            return;
        }
    }

    /**
     * @notice Returns the circuit indices for a given attestation type
     * @dev Uses CircuitConstantsV2 to get the appropriate indices for the attestation
     * @param attestationId The attestation identifier
     * @return indices The DiscloseIndices struct containing all relevant indices
     */
    function _getDiscloseIndices(bytes32 attestationId) internal pure returns (CircuitConstantsV2.DiscloseIndices memory) {
        return CircuitConstantsV2.getDiscloseIndices(attestationId);
    }
}
