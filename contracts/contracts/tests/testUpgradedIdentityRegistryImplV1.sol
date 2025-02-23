// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IdentityRegistryStorageV1} from "../registry/IdentityRegistryImplV1.sol";

/**
 * @title IdentityRegistryStorageV1
 * @dev Abstract contract for storage layout of IdentityRegistryImplV1.
 * Inherits from ImplRoot to provide upgradeable functionality.
 */
abstract contract UpgradedIdentityRegistryStorageV1
{
    bool internal _isTest;
}

/**
 * @title IdentityRegistryImplV1
 * @notice Provides functions to register and manage identity commitments using a Merkle tree structure.
 * @dev Inherits from IdentityRegistryStorageV1 and implements IIdentityRegistryV1.
 */
contract testUpgradedIdentityRegistryImplV1 is 
    IdentityRegistryStorageV1,
    UpgradedIdentityRegistryStorageV1
{
    // ====================================================
    // Events
    // ====================================================

    /**
     * @notice Emitted when the hub is initialized.
     */
    event TestRegistryInitialized();

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
     * @notice Initializes the registry implementation.
     * @dev Sets the hub address and initializes the UUPS upgradeable feature.
     * @param isTestInput The address of the identity verification hub.
     */
    function initialize(
        bool isTestInput
    ) 
        external
        reinitializer(2) 
    {
        __ImplRoot_init();
        _isTest = isTestInput;
        emit TestRegistryInitialized();
    }

    // ====================================================
    // External Functions - View & Checks
    // ====================================================

    function isTest()
        external
        virtual
        onlyProxy
        view
        returns (bool)
    {
        return _isTest;
    }

}