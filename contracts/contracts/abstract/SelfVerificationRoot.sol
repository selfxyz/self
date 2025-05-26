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
     * @param identityVerificationHubAddress The address of the Identity Verification Hub.
     * @param scopeValue The expected proof scope for user registration.
     * @param attestationIds The expected attestation identifiers required in proofs.
     */
    constructor(address identityVerificationHubAddress, uint256 scopeValue, uint256[] memory attestationIds) {
        _identityVerificationHub = IIdentityVerificationHubV1(identityVerificationHubAddress);
        _scope = scopeValue;

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
     * @notice Adds a new attestation ID to the allowed list
     * @dev Used to add support for additional attestation types
     * @param attestationId The attestation ID to add
     */
    function _addAttestationId(uint256 attestationId) internal {
        _attestationIdToEnabled[attestationId] = true;
        emit AttestationIdAdded(attestationId);
    }

    /**
     * @notice Removes an attestation ID from the allowed list
     * @dev Used to revoke support for specific attestation types
     * @param attestationId The attestation ID to remove
     */
    function _removeAttestationId(uint256 attestationId) internal {
        _attestationIdToEnabled[attestationId] = false;
        emit AttestationIdRemoved(attestationId);
    }

    /**
     * @notice Helper function to get an array of revealed data values from proof signals
     * @dev Returns an array of the three packed revealed data values
     * @param pubSignals The proof's public signals
     * @return revealedDataPacked Array of the three packed revealed data values
     */
    function _getRevealedDataPacked(
        uint256[21] calldata pubSignals
    ) internal pure returns (uint256[3] memory revealedDataPacked) {
        revealedDataPacked[0] = pubSignals[REVEALED_DATA_PACKED_INDEX];
        revealedDataPacked[1] = pubSignals[REVEALED_DATA_PACKED_INDEX + 1];
        revealedDataPacked[2] = pubSignals[REVEALED_DATA_PACKED_INDEX + 2];
        return revealedDataPacked;
    }

    /**
     * @notice Verifies a self-proof
     * @dev Validates scope and attestation ID before performing verification through the identity hub
     * @param proof The proof data for verification and disclosure
     */
    function verifySelfProof(ISelfVerificationRoot.DiscloseCircuitProof calldata proof) public {
        // Cache storage reads for gas optimization
        uint256 cachedScope = _scope;

        if (cachedScope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (!_attestationIdToEnabled[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]]) {
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
                    a: proof.a,
                    b: proof.b,
                    c: proof.c,
                    pubSignals: proof.pubSignals
                })
            })
        );

        uint256[3] memory revealedDataPacked = _getRevealedDataPacked(proof.pubSignals);
        uint256 userIdentifier = proof.pubSignals[USER_IDENTIFIER_INDEX];
        uint256 nullifier = proof.pubSignals[NULLIFIER_INDEX];

        emit VerificationSuccess(revealedDataPacked, userIdentifier, nullifier);
        onBasicVerificationSuccess(revealedDataPacked, userIdentifier, nullifier);
    }

    /**
     * @notice Hook called after successful verification
     * @dev Virtual function to be overridden by derived contracts for custom business logic
     * @param revealedDataPacked The packed revealed data from the proof
     * @param userIdentifier The user identifier from the proof
     * @param nullifier The nullifier from the proof
     */
    function onBasicVerificationSuccess(
        uint256[3] memory revealedDataPacked,
        uint256 userIdentifier,
        uint256 nullifier
    ) internal virtual;
}
