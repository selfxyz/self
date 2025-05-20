// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "./SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "../interfaces/ISelfVerificationRoot.sol";

/**
 * @title SelfVerificationConsumer
 * @notice Abstract consumer contract for self verification that developers can inherit
 * @dev Extends SelfVerificationRoot and implements additional verification logic including nullifier tracking
 */
abstract contract SelfVerificationConsumer is SelfVerificationRoot {
    // ====================================================
    // Storage Variables
    // ====================================================

    /// @notice Mapping to track used nullifiers
    mapping(uint256 nullifier => bool used) internal _nullifiers;

    // ====================================================
    // Events
    // ====================================================

    /// @notice Event emitted when a verification is successful
    event VerificationSuccess(uint256 nullifier);

    // ====================================================
    // Errors
    // ====================================================

    /// @notice Error thrown when a nullifier check fails
    error NullifierCheckFailed();

    /**
     * @notice Initializes the SelfVerificationConsumer contract
     * @param _identityVerificationHub The address of the Identity Verification Hub
     * @param _scope The expected proof scope for user registration
     * @param _attestationIds Array of allowed attestation identifiers required in proofs
     */
    constructor(
        address _identityVerificationHub,
        uint256 _scope,
        uint256[] memory _attestationIds
    ) SelfVerificationRoot(_identityVerificationHub, _scope, _attestationIds) {}

    /**
     * @notice Verifies a self-proof and processes the result
     * @dev Checks nullifier using validateNullifier and updateNullifier, then calls parent verification and invokes onVerificationSuccess hook
     * @param _proof The proof data for verification and disclosure
     */
    function verifySelfProof(ISelfVerificationRoot.DiscloseCircuitProof memory _proof) public override {
        uint256 _nullifier = _proof.pubSignals[NULLIFIER_INDEX];

        // Nullifier validation - can be customized by overriding validateNullifier
        if (!validateNullifier(_nullifier, _proof)) {
            revert NullifierCheckFailed();
        }

        // Scope and attestation ID validation handled in parent
        super.verifySelfProof(_proof);

        // Update nullifier state - can be customized by overriding updateNullifier
        updateNullifier(_nullifier, _proof);

        // Call hook and emit event
        onVerificationSuccess(getRevealedDataPacked(_proof.pubSignals), _proof.pubSignals[USER_IDENTIFIER_INDEX]);
        emit VerificationSuccess(_nullifier);
    }

    /**
     * @notice Validates if a nullifier can be used
     * @dev Virtual function that can be overridden to implement custom nullifier validation logic
     * @param _nullifier The nullifier to validate
     * @param _proof The complete proof data (can be used for context-specific validation)
     * @return valid True if the nullifier is valid to use, false otherwise
     */
    function validateNullifier(
        uint256 _nullifier,
        ISelfVerificationRoot.DiscloseCircuitProof memory _proof
    ) internal virtual returns (bool) {
        // Default implementation: strict one-time-use policy
        return !_nullifiers[_nullifier];
    }

    /**
     * @notice Updates the state for a nullifier after successful verification
     * @dev Virtual function that can be overridden to implement custom nullifier state updates
     * @param _nullifier The nullifier to update
     * @param _proof The complete proof data (can be used for context-specific updates)
     */
    function updateNullifier(
        uint256 _nullifier,
        ISelfVerificationRoot.DiscloseCircuitProof memory _proof
    ) internal virtual {
        // Default implementation: mark nullifier as used (one-time-use)
        _nullifiers[_nullifier] = true;
    }

    /**
     * @notice Hook called after successful verification
     * @dev Virtual function to be overridden by derived contracts for custom business logic
     * @param _revealedDataPacked The packed revealed data from the proof
     * @param _userIdentifier The user identifier from the proof
     */
    function onVerificationSuccess(uint256[3] memory _revealedDataPacked, uint256 _userIdentifier) internal virtual;
}
