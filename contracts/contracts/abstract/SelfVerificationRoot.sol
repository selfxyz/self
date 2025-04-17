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
    mapping(uint256 => bool) internal _attestationIds;

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
    uint256 internal constant FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX = CircuitConstants.VC_AND_DISCLOSE_FORBIDDEN_COUNTRIES_LIST_PACKED_INDEX;
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

    /**
     * @notice Initializes the SelfVerificationRoot contract.
     * @param identityVerificationHub The address of the Identity Verification Hub.
     * @param scope The expected proof scope for user registration.
     * @param attestationIds The expected attestation identifiers required in proofs.
     */
    constructor(
        address identityVerificationHub,
        uint256 scope,
        uint256[] memory attestationIds
    ) {
        _identityVerificationHub = IIdentityVerificationHubV1(identityVerificationHub);
        _scope = scope;
        for (uint256 i = 0; i < attestationIds.length; i++) {
            _attestationIds[attestationIds[i]] = true;
        }
    }

    /**
     * @notice Updates the verification configuration
     * @dev Used to set or update verification parameters after contract deployment
     * @param verificationConfig The new verification configuration to apply
     */
    function _setVerificationConfig(
        ISelfVerificationRoot.VerificationConfig memory verificationConfig
    ) internal {
        _verificationConfig = verificationConfig;
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
    }

    /**
     * @notice Adds a new attestation ID to the allowed list
     * @dev Used to add support for additional attestation types
     * @param attestationId The attestation ID to add
     */
    function _addAttestationId(uint256 attestationId) internal {
        _attestationIds[attestationId] = true;
    }

    /**
     * @notice Removes an attestation ID from the allowed list
     * @dev Used to revoke support for specific attestation types
     * @param attestationId The attestation ID to remove
     */
    function _removeAttestationId(uint256 attestationId) internal {
        _attestationIds[attestationId] = false;
    }

    /**
     * @notice Helper function to get an array of revealed data values from proof signals
     * @dev Returns an array of the three packed revealed data values
     * @param pubSignals The proof's public signals
     * @return revealedDataPacked Array of the three packed revealed data values
     */
    function getRevealedDataPacked(uint256[21] memory pubSignals) internal pure returns (uint256[3] memory revealedDataPacked) {
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
    function verifySelfProof(
        ISelfVerificationRoot.DiscloseCircuitProof memory proof
    ) 
        public
        virtual
    {
        if (_scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (!_attestationIds[proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]]) {
            revert InvalidAttestationId();
        }

        _identityVerificationHub.verifyVcAndDisclose(
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: _verificationConfig.olderThanEnabled,
                olderThan: _verificationConfig.olderThan,
                forbiddenCountriesEnabled: _verificationConfig.forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: _verificationConfig.forbiddenCountriesListPacked,
                ofacEnabled: _verificationConfig.ofacEnabled,
                vcAndDiscloseProof: IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof({
                    a: proof.a,
                    b: proof.b,
                    c: proof.c,
                    pubSignals: proof.pubSignals
                })
            })
        );
    }
}