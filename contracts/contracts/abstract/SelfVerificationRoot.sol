// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
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
    // Storage Variables
    // ====================================================

    /// @notice The scope value that proofs must match
    /// @dev Used to validate that submitted proofs match the expected scope
    uint256 internal _scope;

    /// @notice The attestation ID that proofs must match
    /// @dev Used to validate that submitted proofs is generated with allowed attestation IDs
    mapping(uint256 attestationId => bool attestationIdEnabled) internal _attestationIdToEnabled;

    /// @notice Configuration settings for the verification process
    /// @dev Contains settings for age verification, country restrictions, and OFAC checks
    ISelfVerificationRoot.VerificationConfig internal _verificationConfig;

    /// @notice Reference to the identity verification hub contract
    /// @dev Immutable reference used for proof verification
    IIdentityVerificationHubV1 internal immutable _identityVerificationHub;

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

    // ====================================================
    // Events
    // ====================================================

    /// @notice Emitted when the verification configuration is updated
    event VerificationConfigUpdated(ISelfVerificationRoot.VerificationConfig indexed verificationConfig);

    /// @notice Emitted when the verification is successful
    event VerificationSuccess(uint256[3] revealedDataPacked, uint256 indexed userIdentifier, uint256 indexed nullifier);

    /// @notice Emitted when the scope is updated
    event ScopeUpdated(uint256 indexed newScope);

    /// @notice Emitted when a new attestation ID is added
    event AttestationIdAdded(uint256 indexed attestationId);

    /// @notice Emitted when an attestation ID is removed
    event AttestationIdRemoved(uint256 indexed attestationId);

    /**
     * @notice Initializes the SelfVerificationRoot contract.
     * @param _identityVerificationHubAddress The address of the Identity Verification Hub.
     * @param _scopeValue The expected proof scope for user registration.
     * @param _attestationIds The expected attestation identifiers required in proofs.
     */
    constructor(address _identityVerificationHubAddress, uint256 _scopeValue, uint256[] memory _attestationIds) {
        _identityVerificationHub = IIdentityVerificationHubV1(_identityVerificationHubAddress);
        _scope = _scopeValue;

        // Cache array length for gas optimization
        uint256 length = _attestationIds.length;
        for (uint256 i; i < length; ) {
            _attestationIdToEnabled[_attestationIds[i]] = true;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Updates the verification configuration
     * @dev Used to set or update verification parameters after contract deployment
     * @param _newVerificationConfig The new verification configuration to apply
     */
    function _setVerificationConfig(ISelfVerificationRoot.VerificationConfig memory _newVerificationConfig) internal {
        _verificationConfig = _newVerificationConfig;
        emit VerificationConfigUpdated(_newVerificationConfig);
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
     * @param _newScope The new scope value to set
     */
    function _setScope(uint256 _newScope) internal {
        _scope = _newScope;
        emit ScopeUpdated(_newScope);
    }

    /**
     * @notice Adds a new attestation ID to the allowed list
     * @dev Used to add support for additional attestation types
     * @param _attestationId The attestation ID to add
     */
    function _addAttestationId(uint256 _attestationId) internal {
        _attestationIdToEnabled[_attestationId] = true;
        emit AttestationIdAdded(_attestationId);
    }

    /**
     * @notice Removes an attestation ID from the allowed list
     * @dev Used to revoke support for specific attestation types
     * @param _attestationId The attestation ID to remove
     */
    function _removeAttestationId(uint256 _attestationId) internal {
        _attestationIdToEnabled[_attestationId] = false;
        emit AttestationIdRemoved(_attestationId);
    }

    /**
     * @notice Helper function to get an array of revealed data values from proof signals
     * @dev Returns an array of the three packed revealed data values
     * @param _pubSignals The proof's public signals
     * @return revealedDataPacked Array of the three packed revealed data values
     */
    function getRevealedDataPacked(
        uint256[21] calldata _pubSignals
    ) internal pure returns (uint256[3] memory revealedDataPacked) {
        revealedDataPacked[0] = _pubSignals[REVEALED_DATA_PACKED_INDEX];
        revealedDataPacked[1] = _pubSignals[REVEALED_DATA_PACKED_INDEX + 1];
        revealedDataPacked[2] = _pubSignals[REVEALED_DATA_PACKED_INDEX + 2];
        return revealedDataPacked;
    }

    /**
     * @notice Verifies a self-proof
     * @dev Validates scope and attestation ID before performing verification through the identity hub
     * @param _proof The proof data for verification and disclosure
     */
    function verifySelfProof(ISelfVerificationRoot.DiscloseCircuitProof calldata _proof) public {
        // Cache storage reads for gas optimization
        uint256 cachedScope = _scope;

        if (cachedScope != _proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (!_attestationIdToEnabled[_proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]]) {
            revert InvalidAttestationId();
        }

        // Cache verification config to avoid multiple storage reads
        ISelfVerificationRoot.VerificationConfig memory config = _verificationConfig;

        _identityVerificationHub.verifyVcAndDisclose(
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: config.olderThanEnabled,
                olderThan: config.olderThan,
                forbiddenCountriesEnabled: config.forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: config.forbiddenCountriesListPacked,
                ofacEnabled: config.ofacEnabled,
                vcAndDiscloseProof: IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof({
                    a: _proof.a,
                    b: _proof.b,
                    c: _proof.c,
                    pubSignals: _proof.pubSignals
                })
            })
        );

        uint256[3] memory revealedDataPacked = getRevealedDataPacked(_proof.pubSignals);
        uint256 userIdentifier = _proof.pubSignals[USER_IDENTIFIER_INDEX];
        uint256 nullifier = _proof.pubSignals[NULLIFIER_INDEX];

        emit VerificationSuccess(revealedDataPacked, userIdentifier, nullifier);
        onBasicVerificationSuccess(revealedDataPacked, userIdentifier, nullifier);
    }

    /**
     * @notice Hook called after successful verification
     * @dev Virtual function to be overridden by derived contracts for custom business logic
     * @param _revealedDataPacked The packed revealed data from the proof
     * @param _userIdentifier The user identifier from the proof
     * @param _nullifier The nullifier from the proof
     */
    function onBasicVerificationSuccess(
        uint256[3] memory _revealedDataPacked,
        uint256 _userIdentifier,
        uint256 _nullifier
    ) internal virtual;
}
