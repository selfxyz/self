// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IdentityRegistryStorageV1} from "../registry/IdentityRegistryImplV1.sol";
import { InternalLeanIMT, LeanIMTData } from "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";

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
    using InternalLeanIMT for LeanIMTData;
    
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

    function hub() 
        external
        virtual
        onlyProxy
        view 
        returns (address) 
    {
        return _hub;
    }

    function nullifiers(
        bytes32 attestationId,
        uint256 nullifier
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (bool) 
    {
        return _nullifiers[attestationId][nullifier];
    }

    function isRegisteredDscKeyCommitment(
        uint256 commitment
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (bool) 
    {
        return _isRegisteredDscKeyCommitment[commitment];
    }

    function rootTimestamps(
        uint256 root
    ) 
        external
        virtual
        onlyProxy
        view 
        returns (uint256) 
    {
        return _rootTimestamps[root];
    }

    function checkIdentityCommitmentRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _rootTimestamps[root] != 0;
    }

    function getIdentityCommitmentMerkleTreeSize() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _identityCommitmentIMT.size;
    }

    function getIdentityCommitmentMerkleRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _identityCommitmentIMT._root();
    }

    function getIdentityCommitmentIndex(
        uint256 commitment
    ) 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _identityCommitmentIMT._indexOf(commitment);
    }

    function getPassportNoOfacRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _passportNoOfacRoot;
    }

    function getNameAndDobOfacRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _nameAndDobOfacRoot;
    }

    function getNameAndYobOfacRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _nameAndYobOfacRoot;
    }

    function checkOfacRoots(
        uint256 passportNoRoot,
        uint256 nameAndDobRoot,
        uint256 nameAndYobRoot
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _passportNoOfacRoot == passportNoRoot
            && _nameAndDobOfacRoot == nameAndDobRoot
            && _nameAndYobOfacRoot == nameAndYobRoot;
    }

    function getCscaRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _cscaRoot;
    }

    function checkCscaRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _cscaRoot == root;
    }

    function getDscKeyCommitmentMerkleRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _dscKeyCommitmentIMT._root();
    }

    function checkDscKeyCommitmentMerkleRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return _dscKeyCommitmentIMT._root() == root;
    }

    function getDscKeyCommitmentTreeSize() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return _dscKeyCommitmentIMT.size;
    }

    function getDscKeyCommitmentIndex(
        uint256 commitment
    )
        external
        onlyProxy
        view
        returns (uint256)
    {
        return _dscKeyCommitmentIMT._indexOf(commitment);
    }

}