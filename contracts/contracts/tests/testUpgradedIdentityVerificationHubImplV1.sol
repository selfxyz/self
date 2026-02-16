// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IdentityVerificationHubStorageV1} from "../IdentityVerificationHubImplV1.sol";

abstract contract UpgradedIdentityVerificationHubStorageV1 {
    bool internal _isTest;
}

/**
 * @title IdentityVerificationHubImplV1
 * @notice Implementation contract for the Identity Verification Hub.
 * @dev Provides functions for registering commitments and verifying groth16 proofs and inclusion proofs.
 */
contract testUpgradedIdentityVerificationHubImplV1 is
    IdentityVerificationHubStorageV1,
    UpgradedIdentityVerificationHubStorageV1
{
    // ====================================================
    // Events
    // ====================================================

    /**
     * @notice Emitted when the hub is initialized.
     */
    event TestHubInitialized();

    // ====================================================
    // Constructor
    // ====================================================

    /**
     * @notice Constructor that disables initializers.
     * @dev Prevents direct initialization of the implementation contract.
     */
    constructor() {
        _disableInitializers();
    }

    // ====================================================
    // Initializer
    // ====================================================

    /**
     * @notice Initializes the hub implementation.
     * @dev Sets the registry, VC and Disclose circuit verifier address, register circuit verifiers, and DSC circuit verifiers.
     * @param isTestInput Boolean value which shows it is test or not
     */
    function initialize(bool isTestInput) external reinitializer(3) {
        __Ownable_init(msg.sender);
        _isTest = isTestInput;
        emit TestHubInitialized();
    }

    // ====================================================
    // External View Functions
    // ====================================================

    function isTest() external view virtual onlyProxy returns (bool) {
        return _isTest;
    }

    function registry() external view virtual onlyProxy returns (address) {
        return _registry;
    }

    function vcAndDiscloseCircuitVerifier() external view virtual onlyProxy returns (address) {
        return _vcAndDiscloseCircuitVerifier;
    }

    function sigTypeToRegisterCircuitVerifiers(uint256 typeId) external view virtual onlyProxy returns (address) {
        return _sigTypeToRegisterCircuitVerifiers[typeId];
    }

    function sigTypeToDscCircuitVerifiers(uint256 typeId) external view virtual onlyProxy returns (address) {
        return _sigTypeToDscCircuitVerifiers[typeId];
    }
}
