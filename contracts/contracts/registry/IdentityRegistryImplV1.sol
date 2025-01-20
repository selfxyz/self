// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Base64} from "../libraries/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import "../interfaces/IIdentityRegistryV1.sol";
import "../interfaces/IIdentityVerificationHubV1.sol";

/**
 * @notice ⚠️ CRITICAL STORAGE LAYOUT WARNING ⚠️
 * =============================================
 * 
 * This contract uses the UUPS upgradeable pattern which makes storage layout EXTREMELY SENSITIVE.
 * 
 * 🚫 NEVER MODIFY OR REORDER existing storage variables
 * 🚫 NEVER INSERT new variables between existing ones
 * 🚫 NEVER CHANGE THE TYPE of existing variables
 * 
 * ✅ New storage variables MUST be added in one of these two ways ONLY:
 *    1. At the END of the storage layout
 *    2. In a new V2 contract that inherits from this V1
 * ✅ It is safe to rename variables (e.g., changing 'variable' to 'oldVariable')
 *    as long as the type and order remain the same
 * 
 * Examples of forbidden changes:
 * - Changing uint256 to uint128
 * - Changing bytes32 to bytes
 * - Changing array type to mapping
 * 
 * For more detailed information about forbidden changes, please refer to:
 * https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#modifying-your-contracts
 * 
 * ⚠️ VIOLATION OF THESE RULES WILL CAUSE CATASTROPHIC STORAGE COLLISIONS IN FUTURE UPGRADES ⚠️
 * =============================================
 */
contract IdentityRegistryStorageV1{
    address internal hub;

    // CSCA root
    uint256 internal cscaRoot;

    // commitment registry
    LeanIMTData internal identityCommitmentIMT;
    // timestamp of when the root was created
    mapping(uint256 => uint256) internal rootTimestamps;
    // attestation id => nullifier => bool
    // attestation id for each identity type
    // passport: 0x12d57183e0a41615471a14e5a93c87b9db757118c1d7a6a9f73106819d656f24
    // poseidon("E-PASSPORT")
    mapping(bytes32 => mapping(uint256 => bool)) internal nullifiers;

    // ofac registry
    uint256 internal ofacRoot;
}
// TODO: Add modifier named onlyPortal
contract IdentityRegistryImplV1 is UUPSUpgradeable, OwnableUpgradeable, IdentityRegistryStorageV1, IIdentityRegistryV1 {

    using Base64 for *;
    using Strings for uint256;
    using InternalLeanIMT for LeanIMTData;

    error HUB_NOT_SET();
    error ONLY_HUB_CAN_REGISTER_COMMITMENT();
    error REGISTERED_IDENTITY();

    event CommitmentRegistered(bytes32 indexed attestationId, uint256 indexed nullifier, uint256 indexed commitment, uint256 timestamp, uint256 imtRoot, uint256 imtIndex);
    event CommitmentUpdated(uint256 indexed oldLeaf, uint256 indexed newLeaf, uint256 imtRoot, uint256 timestamp);
    event CommitmentRemoved(uint256 indexed oldLeaf, uint256 imtRoot, uint256 timestamp);
    
    function initialize(
        address _hub
    ) 
        external
        initializer 
    {
        __Ownable_init(msg.sender);
        hub = _hub;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) 
        internal 
        override
        onlyProxy
        onlyOwner 
    {}

    ///////////////////////////////////////////////////////////////////
    ///                     UPDATE FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function updateHub(
        address _hub
    ) 
        external 
        onlyProxy
        onlyOwner 
    { 
        hub = _hub;
    }

    function updateOfacRoot(
        uint256 _ofacRoot
    ) 
        external
        onlyProxy
        onlyOwner 
    {
        ofacRoot = _ofacRoot;
    }


    function updateCscaRoot(
        uint256 _cscaRoot
    ) 
        external
        onlyProxy
        onlyOwner 
    {
        cscaRoot = _cscaRoot;
    }

    ///////////////////////////////////////////////////////////////////
    ///                     REGISTER COMMITMENT                     ///
    ///////////////////////////////////////////////////////////////////

    function registerCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) 
        external
        onlyProxy
    {
        if (address(hub) == address(0)) revert HUB_NOT_SET();
            if (msg.sender != address(hub)) revert ONLY_HUB_CAN_REGISTER_COMMITMENT();
        if (nullifiers[attestationId][nullifier]) revert REGISTERED_IDENTITY();

        nullifiers[attestationId][nullifier] = true;
        uint256 index = identityCommitmentIMT.size;
        uint256 imt_root = _addCommitment(commitment);
        emit CommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    ///////////////////////////////////////////////////////////////////
    ///                     VIEW FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////
    function checkIdentityCommitmentRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return rootTimestamps[root] != 0;
    }

    function getIdentityCommitmentRootTimestamp(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return rootTimestamps[root];
    }

    function getIdentityCommitmentMerkleTreeSize() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT.size;
    }

    function getIdentityCommitmentMerkleRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT._root();
    }

    function getIdentityCommitmentIndex(
        uint256 commitment
    ) 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT._indexOf(commitment);
    }

    function getIdentityCommitment(
        uint256 index
    ) 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT.leaves[index];
    }

    function getAllIdentityCommitments() 
        external
        onlyProxy
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory commitments = new uint256[](identityCommitmentIMT.size);
        for (uint256 i = 0; i < identityCommitmentIMT.size; i++) {
            commitments[i] = identityCommitmentIMT.leaves[i];
        }
        return commitments;
    }

    function getOfacRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return ofacRoot;
    }

    function getCscaRoot() 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return cscaRoot;
    }

    function checkOfacRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return ofacRoot == root;
    }

    function checkCscaRoot(
        uint256 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return cscaRoot == root;
    }
    
    ///////////////////////////////////////////////////////////////////
    ///                     DEV FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function devAddIdentityCommitment(
        bytes32 attestationId,
        uint256 nullifier,
        uint256 commitment
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        uint256 imt_root = _addCommitment(commitment);
        uint256 index = identityCommitmentIMT._indexOf(commitment);
        emit CommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    function devUpdateCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    )
        external
        onlyProxy
        onlyOwner
    {
        uint256 imt_root = _updateCommitment(oldLeaf, newLeaf, siblingNodes);
        emit CommitmentUpdated(oldLeaf, newLeaf, imt_root, block.timestamp);
    }

    function devRemoveCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    )
        external
        onlyProxy
        onlyOwner
    {
        uint256 imt_root = _removeCommitment(oldLeaf, siblingNodes);
        emit CommitmentRemoved(oldLeaf, imt_root, block.timestamp);
    }

    ///////////////////////////////////////////////////////////////////
    ///                     INTERNAL FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////
    
    function _addCommitment(
        uint256 commitment
    ) 
        internal
        returns(uint256 imt_root)
    {
        imt_root = identityCommitmentIMT._insert(commitment);
        rootTimestamps[imt_root] = block.timestamp;
    }

    function _updateCommitment(
        uint256 oldLeaf,
        uint256 newLeaf,
        uint256[] calldata siblingNodes
    )
        internal
        returns(uint256 imt_root)
    {
        imt_root = identityCommitmentIMT._update(oldLeaf, newLeaf, siblingNodes);
        rootTimestamps[imt_root] = block.timestamp;
    }

    function _removeCommitment(
        uint256 oldLeaf,
        uint256[] calldata siblingNodes
    )
        internal
        returns(uint256 imt_root)
    {
        imt_root = identityCommitmentIMT._remove(oldLeaf, siblingNodes);
        rootTimestamps[imt_root] = block.timestamp;
    }
}