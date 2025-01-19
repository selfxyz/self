// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Base64} from "../libraries/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import "../interfaces/IIdentityCommitmentRegistryV1.sol";
import "../interfaces/IIdentityVerificationHubV1.sol";
// TODO: Add modifier named onlyPortal
contract IdentityCommitmentRegistryImplV1 is UUPSUpgradeable, OwnableUpgradeable, IIdentityCommitmentRegistryV1 {

    using Base64 for *;
    using Strings for uint256;
    using InternalLeanIMT for LeanIMTData;

    error HUB_NOT_SET();
    error ONLY_HUB_CAN_REGISTER_COMMITMENT();
    error NULLIFIER_ALREADY_REGISTERED();

    event AddCommitment(bytes32 indexed attestationId, bytes32 indexed nullifier, bytes32 indexed commitment, uint256 timestamp, bytes32 imtRoot, uint256 imtIndex);

    // Storage Patterns
    // When you do the upgrade, be careful with this storage patterns
    // You can not change this, just add new storage variables later of these patterns
    IIdentityVerificationHubV1 private hub_V1;
    LeanIMTData private identityCommitmentIMT_V1;
    // timestamp of when the root was created
    mapping(bytes32 => uint256) private rootTimestamps;
    // attestation id => nullifier => bool
    // attestation id for each identity type
    // passport: bytes32(0x12d57183e0a41615471a14e5a93c87b9db757118c1d7a6a9f73106819d656f24
    // poseidon("E-PASSPORT")
    mapping(bytes32 => mapping(bytes32 => bool)) private nullifiers_V1;

    function initialize(
        IIdentityVerificationHubV1 _hub_V1
    ) 
        external
        initializer 
    {
        __Ownable_init(msg.sender);
        hub_V1 = _hub_V1;
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

    function updateHub_V1(
        IIdentityVerificationHubV1 _hub_V1
    ) 
        external 
        onlyOwner 
    { 
        hub_V1 = _hub_V1;
    }


    ///////////////////////////////////////////////////////////////////
    ///                     REGISTER COMMITMENT                     ///
    ///////////////////////////////////////////////////////////////////

    function registerCommitment(
        bytes32 commitment,
        bytes32 attestationId,
        bytes32 nullifier
    ) 
        external 
    {
        if (address(hub_V1) == address(0)) revert HUB_NOT_SET();
        if (msg.sender != address(hub_V1)) revert ONLY_HUB_CAN_REGISTER_COMMITMENT();
        if (nullifiers_V1[attestationId][nullifier]) revert NULLIFIER_ALREADY_REGISTERED();

        nullifiers_V1[attestationId][nullifier] = true;
        uint256 index = identityCommitmentIMT_V1.size;
        bytes32 imt_root = _addCommitment(commitment);
        emit AddCommitment(attestationId, nullifier, commitment, block.timestamp, imt_root, index);
    }

    function _addCommitment(
        bytes32 commitment
    ) 
        private
        returns(bytes32 imt_root)
    {
        imt_root = bytes32(identityCommitmentIMT_V1._insert(uint256(commitment)));
        rootTimestamps[imt_root] = block.timestamp;
    }


    ///////////////////////////////////////////////////////////////////
    ///                     VIEW FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////
    function checkRoot(
        bytes32 root
    ) 
        external 
        view 
        returns (bool) 
    {
        return rootTimestamps[root] != 0;
    }

    function getRootTimestamp(
        bytes32 root
    ) 
        public 
        view 
        returns (uint256) 
    {
        return rootTimestamps[root];
    }

    function getMerkleTreeSize() 
        public
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT_V1.size;
    }

    function getMerkleRoot() 
        public 
        view 
        returns (bytes32) 
    {
        return bytes32(identityCommitmentIMT_V1._root());
    }

    function indexOf(
        uint commitment
    ) 
        public 
        view 
        returns (uint256) 
    {
        return identityCommitmentIMT_V1._indexOf(commitment);
    }

    function getCommitment(
        uint256 index
    ) 
        public 
        view 
        returns (bytes32) 
    {
        return bytes32(identityCommitmentIMT_V1.leaves[index]);
    }

    function getAllCommitments() 
        public 
        view 
        returns (bytes32[] memory) 
    {
        bytes32[] memory commitments = new bytes32[](identityCommitmentIMT_V1.size);
        for (uint256 i = 0; i < identityCommitmentIMT_V1.size; i++) {
            commitments[i] = bytes32(identityCommitmentIMT_V1.leaves[i]);
        }
        return commitments;
    }
    
    ///////////////////////////////////////////////////////////////////
    ///                     DEV FUNCTIONS                        ///
    ///////////////////////////////////////////////////////////////////

    function devAddCommitment(
        bytes32 commitment
    ) 
        external 
        onlyOwner 
    {
        _addCommitment(commitment);
    }

}
