// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ImplRoot} from "../upgradeable/ImplRoot.sol";

abstract contract UpgradedIdentityVerificationHubStorageV2 {
    bool internal _isTest;
    address internal _registry;
    address internal _vcAndDiscloseCircuitVerifier;
    mapping(uint256 => address) internal _sigTypeToRegisterCircuitVerifiers;
    mapping(uint256 => address) internal _sigTypeToDscCircuitVerifiers;
}

/**
 * @title testUpgradedIdentityVerificationHubImplV2
 * @notice Test Implementation contract for the Identity Verification Hub V2 upgrade.
 * @dev Provides functions for testing upgrade functionality.
 */
contract testUpgradedIdentityVerificationHubImplV2 is ImplRoot, UpgradedIdentityVerificationHubStorageV2 {
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
        __ImplRoot_init();
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
