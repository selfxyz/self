// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IVcAndDiscloseCircuitVerifier} from "../interfaces/IVcAndDiscloseCircuitVerifier.sol";
import {IIdentityVerificationHubV1} from "../interfaces/IIdentityVerificationHubV1.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";
import {CircuitConstants} from "../constants/CircuitConstants.sol";

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
    /// @dev Used to validate that submitted proofs contain the correct attestation
    uint256 internal _attestationId;

    /// @notice Configuration settings for the verification process
    /// @dev Contains settings for age verification, country restrictions, and OFAC checks
    ISelfVerificationRoot.VerificationConfig internal _verificationConfig;

    /// @notice Reference to the identity verification hub contract
    /// @dev Immutable reference used for proof verification
    IIdentityVerificationHubV1 internal immutable _identityVerificationHub;

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
     * @param attestationId The expected attestation identifier required in proofs.
     * @param olderThanEnabled Flag indicating if 'olderThan' verification is enabled.
     * @param olderThan Value for 'olderThan' verification.
     * @param forbiddenCountriesEnabled Flag indicating if forbidden countries verification is enabled.
     * @param forbiddenCountriesListPacked Packed list of forbidden countries.
     * @param ofacEnabled Array of flags indicating which OFAC checks are enabled. [passportNo, nameAndDob, nameAndYob]
     */
    constructor(
        address identityVerificationHub,
        uint256 scope,
        uint256 attestationId,
        bool olderThanEnabled,
        uint256 olderThan,
        bool forbiddenCountriesEnabled,
        uint256[4] memory forbiddenCountriesListPacked,
        bool[3] memory ofacEnabled
    ) {
        _identityVerificationHub = IIdentityVerificationHubV1(identityVerificationHub);
        _scope = scope;
        _attestationId = attestationId;
        _verificationConfig.olderThanEnabled = olderThanEnabled;
        _verificationConfig.olderThan = olderThan;
        _verificationConfig.forbiddenCountriesEnabled = forbiddenCountriesEnabled;
        _verificationConfig.forbiddenCountriesListPacked = forbiddenCountriesListPacked;
        _verificationConfig.ofacEnabled = ofacEnabled;
    }

    /**
     * @notice Verifies a self-proof
     * @dev Validates scope and attestation ID before performing verification through the identity hub
     * @param proof The proof data for verification and disclosure
     */
    function verifySelfProof(
        bool devMode,
        IVcAndDiscloseCircuitVerifier.VcAndDiscloseProof memory proof
    ) 
        public
        virtual
    {
        if (_scope != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_SCOPE_INDEX]) {
            revert InvalidScope();
        }

        if (_attestationId != proof.pubSignals[CircuitConstants.VC_AND_DISCLOSE_ATTESTATION_ID_INDEX]) {
            revert InvalidAttestationId();
        }

        _identityVerificationHub.verifyVcAndDisclose(
            devMode,
            IIdentityVerificationHubV1.VcAndDiscloseHubProof({
                olderThanEnabled: _verificationConfig.olderThanEnabled,
                olderThan: _verificationConfig.olderThan,
                forbiddenCountriesEnabled: _verificationConfig.forbiddenCountriesEnabled,
                forbiddenCountriesListPacked: _verificationConfig.forbiddenCountriesListPacked,
                ofacEnabled: _verificationConfig.ofacEnabled,
                vcAndDiscloseProof: proof
            })
        );
    }

}