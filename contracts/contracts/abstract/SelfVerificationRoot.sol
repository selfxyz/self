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

    /// @notice Error thrown when the data format is invalid
    /// @dev Triggered when the provided bytes data doesn't have the expected format
    error InvalidDataFormat();


    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the scope is updated
    event ScopeUpdated(uint256 indexed newScope);

    /// @notice Emitted when a new attestation ID is added
    event AttestationIdAdded(bytes32 indexed attestationId);

    /// @notice Emitted when an attestation ID is removed
    event AttestationIdRemoved(bytes32 indexed attestationId);


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
     * @notice Returns the current scope value
     * @return The scope value that proofs must match
     */
    function scope() public view returns (uint256) {
        return _scope;
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
     * @param proofData Packed data from relayer in format: | 32 bytes attestationId | proof data |
     * @param additionalData User-defined data in format: | 32 bytes configId | 32 bytes destChainId | 32 bytes userIdentifier | data |
     */
    /*
        - Extract userIdentifier from userDefinedData
        - Do scope verification
        - Encode contractVersion
        - Call verify function in the Hub contract
        - Call onVerificationSuccess

        proofData = | 32 bytes attestationId | proofData |
        additionalData = | 32 bytes configId | 32 bytes destChainId | 32 bytes userIdentifier | data |
        hubData = | 1 bytes contract version | 31 bytes buffer | 32 bytes scope | 32 bytes attestationId | proofData |
     */
    function verifySelfProof(
        bytes calldata proofData,
        bytes calldata additionalData
    ) public {
        // Minimum expected length for proofData: 32 bytes attestationId + proof data
        if (proofData.length < 32) {
            revert InvalidDataFormat();
        }

        // Minimum userDefinedData length: 32 (configId) + 32 (destChainId) + 32 (userIdentifier) = 96 bytes
        if (additionalData.length < 96) {
            revert InvalidDataFormat();
        }

        bytes32 attestationId;
        assembly {
            // Load attestationId from the beginning of proofData (first 32 bytes)
            attestationId := calldataload(proofData.offset)
        }

        // Validate scope (this check ensures the proof was generated for the correct scope)
        // Note: In a complete implementation, you would extract the scope from the proof
        // and verify it matches _scope. For now, we'll use _scope directly.

        // Hub data should be | 1 byte contractVersion | 31 bytes buffer | 32 bytes scope | 32 bytes attestationId | proof data
        bytes memory hubData = abi.encodePacked(
            // 1 byte contractVersion
            CONTRACT_VERSION,
            // 31 bytes buffer (all zeros)
            bytes31(0),
            // 32 bytes scope
            _scope,
            // 32 bytes attestationId
            attestationId,
            // proof data (starts after 32 bytes attestationId)
            proofData[32:]
        );

        // Call hub V2 verification
        _identityVerificationHubV2.verify(hubData, additionalData);
    }

    function onVerificationSuccess(
        bytes memory output,
        bytes memory userData
    ) public virtual {
    }

}
