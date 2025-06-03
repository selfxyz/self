// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IIdentityVerificationHubV2} from "../interfaces/IIdentityVerificationHubV2.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";
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

    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice The scope value that proofs must match
    /// @dev Used to validate that submitted proofs match the expected scope
    uint256 internal _scope;

    /// @notice The contract version for validation
    /// @dev Used to validate the contract version in relayer data
    uint8 internal _contractVersion;

    /// @notice The attestation ID that proofs must match
    /// @dev Used to validate that submitted proofs is generated with allowed attestation IDs
    mapping(bytes32 attestationId => bool attestationIdEnabled) internal _attestationIdToEnabled;

    /// @notice Configuration settings for the verification process
    /// @dev Contains settings for age verification, country restrictions, and OFAC checks
    ISelfVerificationRoot.VerificationConfig internal _verificationConfig;

    /// @notice Reference to the identity verification hub V2 contract
    /// @dev Immutable reference used for bytes-based proof verification
    IIdentityVerificationHubV2 internal immutable _identityVerificationHubV2;

    // ====================================================
    // Circuit Constants
    // ====================================================

    // Make CircuitConstants available to inheriting contracts
    uint256 internal constant REVEALED_DATA_PACKED_INDEX = CircuitConstants.VC_AND_DISCLOSE_REVEALED_DATA_PACKED_INDEX;
    uint256 internal constant FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX =
        CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX;
    uint256 internal constant NULLIFIER_INDEX = CircuitConstants.VC_AND_DISCLOSE_NULLIFIER_INDEX;
    uint256 internal constant ATTESTATION_ID_INDEX = CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX;
    uint256 internal constant MERKLE_ROOT_INDEX = CircuitConstants.VC_AND_DISCLOSE_MERKLE_ROOT_INDEX;
    uint256 internal constant CURRENT_DATE_INDEX = CircuitConstants.VC_AND_DISCLOSE_CURRENT_DATE_INDEX;
    uint256 internal constant PASSPORT_NO_SMT_ROOT_INDEX = CircuitConstants.VC_AND_DISCLOSE_PASSPORT_NO_SMT_ROOT_INDEX;
    uint256 internal constant NAME_DOB_SMT_ROOT_INDEX = CircuitConstants.VC_AND_DISCLOSE_NAME_DOB_SMT_ROOT_INDEX;
    uint256 internal constant NAME_YOB_SMT_ROOT_INDEX = CircuitConstants.VC_AND_DISCLOSE_NAME_YOB_SMT_ROOT_INDEX;
    uint256 internal constant SCOPE_INDEX = CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX;
    uint256 internal constant USER_IDENTIFIER_INDEX = CircuitConstants.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX;

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

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the verification configuration is updated
    event VerificationConfigUpdated(ISelfVerificationRoot.VerificationConfig indexed verificationConfig);

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

    /// @notice Emitted when the contract version is updated
    event ContractVersionUpdated(uint8 indexed newContractVersion);

    /**
     * @notice Initializes the SelfVerificationRoot contract.
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2.
     * @param scopeValue The expected proof scope for user registration.
     * @param contractVersion The contract version for validation.
     * @param attestationIds The expected attestation identifiers required in proofs.
     */
    constructor(
        address identityVerificationHubV2Address,
        uint256 scopeValue,
        uint8 contractVersion,
        bytes32[] memory attestationIds
    ) {
        _identityVerificationHubV2 = IIdentityVerificationHubV2(identityVerificationHubV2Address);
        _scope = scopeValue;
        _contractVersion = contractVersion;

        // Cache array length for gas optimization
        uint256 length = attestationIds.length;
        for (uint256 i; i < length; ) {
            _attestationIdToEnabled[attestationIds[i]] = true;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Updates the verification configuration
     * @dev Used to set or update verification parameters after contract deployment
     * @param newVerificationConfig The new verification configuration to apply
     */
    function _setVerificationConfig(ISelfVerificationRoot.VerificationConfig memory newVerificationConfig) internal {
        _verificationConfig = newVerificationConfig;
        emit VerificationConfigUpdated(newVerificationConfig);
    }

    /**
     * @notice Returns the current verification configuration
     * @dev Used to retrieve the current verification settings
     * @return Current verification configuration
     */
    function _getVerificationConfig() internal view returns (ISelfVerificationRoot.VerificationConfig memory) {
        return _verificationConfig;
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
     * @notice Updates the contract version
     * @dev Used to change the expected contract version
     * @param newContractVersion The new contract version to set
     */
    function _setContractVersion(uint8 newContractVersion) internal {
        _contractVersion = newContractVersion;
        emit ContractVersionUpdated(newContractVersion);
    }

    /**
     * @notice Adds a new attestation ID to the allowed list
     * @dev Used to add support for additional attestation types
     * @param attestationId The attestation ID to add
     */
    function _addAttestationId(bytes32 attestationId) internal {
        _attestationIdToEnabled[attestationId] = true;
        emit AttestationIdAdded(attestationId);
    }

    /**
     * @notice Removes an attestation ID from the allowed list
     * @dev Used to revoke support for specific attestation types
     * @param attestationId The attestation ID to remove
     */
    function _removeAttestationId(bytes32 attestationId) internal {
        _attestationIdToEnabled[attestationId] = false;
        emit AttestationIdRemoved(attestationId);
    }

    /**
     * @notice Verifies a self-proof using the bytes-based interface
     * @dev Parses relayer data format and validates against contract settings before calling hub V2
     * @param relayerData Packed data from relayer in format: | 1 byte circuitVersion | 31 bytes buffer | 32 bytes attestationId | proof data |
     */
    function verifySelfProof(bytes calldata relayerData) public {
        // Minimum expected length: 1 + 31 + 32 = 64 bytes + proof data
        if (relayerData.length < 64) {
            revert InvalidDataFormat();
        }

        // Parse the relayer data
        uint8 circuitVersion = uint8(relayerData[0]);
        // bytes31 buffer = bytes31(relayerData[1:32]); // Reserved for future use

        bytes32 attestationId;
        assembly {
            // Load attestationId from offset 32 (after 1+31 bytes)
            attestationId := calldataload(add(relayerData.offset, 32))
        }

        // Validate attestation ID against our stored allowed list
        if (!_attestationIdToEnabled[attestationId]) {
            revert InvalidAttestationId();
        }

        // Hub data should be | 1 byte circuitVersion | 1 byte contractVersion | 30 bytes buffer | 32 bytes attestationId | 32 bytes scope | proof data
        bytes memory hubData = abi.encodePacked(
            // 1 byte circuitVersion
            circuitVersion,
            // 1 byte contractVersion
            _contractVersion,
            // 30 bytes buffer (all zeros)
            bytes30(0),
            // 32 bytes attestationId
            attestationId,
            // 32 bytes scope
            _scope,
            // proof data (starts after 1+1+30+32+32 = 96 bytes)
            relayerData[96:]
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
        onBasicVerificationSuccess(
            attestationId,
            scope,
            userIdentifier,
            nullifier,
            identityCommitmentRoot,
            revealedDataPacked,
            forbiddenCountriesListPacked
        );
    }

    /**
     * @notice Hook called after successful verification
     * @dev Virtual function to be overridden by derived contracts for custom business logic
     * @param attestationId The attestation identifier from the proof
     * @param scope The scope of the verification
     * @param userIdentifier The user identifier from the proof
     * @param nullifier The nullifier from the proof
     * @param identityCommitmentRoot The root of the identity commitment
     * @param revealedDataPacked The packed revealed data from the proof (E_PASSPORT_REVEALED_DATA_LENGTH for passport, EU_ID_CARD_REVEALED_DATA_LENGTH for ID card)
     * @param forbiddenCountriesListPacked The packed forbidden countries list
     */
    function onBasicVerificationSuccess(
        bytes32 attestationId,
        uint256 scope,
        uint256 userIdentifier,
        uint256 nullifier,
        uint256 identityCommitmentRoot,
        uint256[] memory revealedDataPacked,
        uint256[4] memory forbiddenCountriesListPacked
    ) internal virtual;
}
