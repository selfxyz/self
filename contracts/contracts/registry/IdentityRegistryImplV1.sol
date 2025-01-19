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
    bytes32 internal cscaRoot;

    // commitment registry
    LeanIMTData internal identityCommitmentIMT;
    // timestamp of when the root was created
    mapping(bytes32 => uint256) internal rootTimestamps;
    // attestation id => nullifier => bool
    // attestation id for each identity type
    // passport: bytes32(0x12d57183e0a41615471a14e5a93c87b9db757118c1d7a6a9f73106819d656f24)
    // poseidon("E-PASSPORT")
    mapping(bytes32 => mapping(bytes32 => bool)) internal nullifiers;

    // ofac registry
    bytes32 internal ofacRoot;
}
// TODO: Add modifier named onlyPortal
contract IdentityRegistryImplV1 is UUPSUpgradeable, OwnableUpgradeable, IdentityRegistryStorageV1, IIdentityRegistryV1 {

    using Base64 for *;
    using Strings for uint256;
    using InternalLeanIMT for LeanIMTData;

    error HUB_NOT_SET();
    error ONLY_HUB_CAN_REGISTER_COMMITMENT();
    error REGISTERED_IDENTITY();

    event CommitmentRegistered(bytes32 indexed attestationId, bytes32 indexed nullifier, bytes32 indexed commitment, uint256 timestamp, bytes32 imtRoot, uint256 imtIndex);
    
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
        onlyOwner 
    {}

    ///////////////////////////////////////////////////////////////////
    ///                     UPDATE FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function updateHub(
        address _hub
    ) 
        external 
        onlyOwner 
    { 
        hub = _hub;
    }

    function updateOfacRoot(
        bytes32 _ofacRoot
    ) 
        external
        onlyOwner
    {
        ofacRoot = _ofacRoot;
    }


    function updateCscaRoot(
        bytes32 _cscaRoot
    ) 
        external
        onlyOwner
    {
        cscaRoot = _cscaRoot;
    }

    ///////////////////////////////////////////////////////////////////
    ///                     REGISTER COMMITMENT                     ///
    ///////////////////////////////////////////////////////////////////

    function registerCommitment(
        bytes32 attestationId,
        bytes32 nullifier,
        bytes32 commitment
    ) 
        external
        onlyProxy
    {
        if (address(hub) == address(0)) revert HUB_NOT_SET();
            if (msg.sender != address(hub)) revert ONLY_HUB_CAN_REGISTER_COMMITMENT();
        if (nullifiers[attestationId][nullifier]) revert REGISTERED_IDENTITY();

        nullifiers[attestationId][nullifier] = true;
        uint256 index = identityCommitmentIMT.size;
        bytes32 imt_root = _addCommitment(commitment);
        emit CommitmentRegistered(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    function _addCommitment(
        bytes32 commitment
    ) 
        private
        returns(bytes32 imt_root)
    {
        imt_root = bytes32(identityCommitmentIMT._insert(uint256(commitment)));
        rootTimestamps[imt_root] = block.timestamp;
    }


    ///////////////////////////////////////////////////////////////////
    ///                     VIEW FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////
    function checkIdentityCommitmentRoot(
        bytes32 root
    ) 
        external
        onlyProxy
        view 
        returns (bool) 
    {
        return rootTimestamps[root] != 0;
    }

    function getIdentityCommitmentRootTimestamp(
        bytes32 root
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
        returns (bytes32) 
    {
        return bytes32(identityCommitmentIMT._root());
    }

    function getIdentityCommitmentIndex(
        bytes32 commitment
    ) 
        external
        onlyProxy
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT._indexOf(uint256(commitment));
    }

    function getIdentityCommitment(
        uint256 index
    ) 
        external
        onlyProxy
        view 
        returns (bytes32) 
    {
        return bytes32(identityCommitmentIMT.leaves[index]);
    }

    function getAllIdentityCommitments() 
        external
        onlyProxy
        view 
        returns (bytes32[] memory) 
    {
        bytes32[] memory commitments = new bytes32[](identityCommitmentIMT.size);
        for (uint256 i = 0; i < identityCommitmentIMT.size; i++) {
            commitments[i] = bytes32(identityCommitmentIMT.leaves[i]);
        }
        return commitments;
    }

    function getOfacRoot() 
        external
        view 
        returns (bytes32) 
    {
        return ofacRoot;
    }

    function getCscaRoot() 
        external
        view 
        returns (bytes32) 
    {
        return cscaRoot;
    }

    function checkOfacRoot(
        bytes32 root
    ) 
        external
        view 
        returns (bool) 
    {
        return ofacRoot == root;
    }

    function checkCscaRoot(
        bytes32 root
    ) 
        external
        view 
        returns (bool) 
    {
        return cscaRoot == root;
    }
    
    ///////////////////////////////////////////////////////////////////
    ///                     DEV FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function devAddIdentityCommitment(
        bytes32 commitment
    ) 
        external 
        onlyProxy
        onlyOwner 
    {
        _addCommitment(commitment);
    }

}