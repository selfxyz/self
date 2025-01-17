// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Base64} from "../libraries/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@zk-kit/imt.sol/internal/InternalLeanIMT.sol";
import "../interfaces/IIdentityCommitmentRegistryV1.sol";

// TODO: Add modifier named onlyPortal
contract IdentifyCommitmentRegistryImplV1 is UUPSUpgradeable, OwnableUpgradeable, IIdentityCommitmentRegistryV1 {

    address public portal;

    error PORTAL_NOT_SET();
    error ONLY_PORTAL_CAN_REGISTER_COMMITMENT();

    using Base64 for *;
    using Strings for uint256;

    using InternalLeanIMT for LeanIMTData;
    LeanIMTData internal imt;
    
    mapping(uint256 => bool) public merkleRootsCreated;

    event AddCommitment(uint256 index, uint256 commitment, uint256 imtRoot);

    function initialize(
        address _portal
    ) 
        external 
        initializer 
    {
        __Ownable_init(msg.sender);
        portal = _portal;
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

    function updatePortal(
        address _portal
    ) 
        external 
        onlyOwner 
    { 
        portal = _portal;
    }

    function registerCommitment(
        uint256 commitment
    ) 
        external 
    {
        if (portal == address(0)) revert PORTAL_NOT_SET();
        if (msg.sender != portal) revert ONLY_PORTAL_CAN_REGISTER_COMMITMENT();
        _addCommitment(commitment);
    }

    function _addCommitment(
        uint256 commitment
    ) 
        internal 
    {
        uint256 index = getMerkleTreeSize();
        uint256 imt_root = imt._insert(commitment);
        merkleRootsCreated[imt_root] = true;
        emit AddCommitment(index, commitment, imt_root);
    }

    function checkRoot(
        uint256 root
    ) 
        external 
        view 
        returns (bool) 
    {
        return merkleRootsCreated[root];
    }

    function getMerkleTreeSize() 
        public 
        view 
        returns (uint256) 
    {
        return imt.size;
    }

    function getMerkleRoot() 
        public 
        view 
        returns (uint256) 
    {
        return imt._root();
    }

    function indexOf(
        uint commitment
    ) 
        public 
        view 
        returns (uint256) 
    {
        return imt._indexOf(commitment);
    }

    function getCommitment(
        uint256 index
    ) 
        public 
        view 
        returns (uint256) 
    {
        return imt.leaves[index];
    }

    function getAllCommitments() 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory commitments = new uint256[](imt.size);
        for (uint256 i = 0; i < imt.size; i++) {
            commitments[i] = imt.leaves[i];
        }
        return commitments;
    }

    function devAddCommitment(
        uint commitment
    ) 
        external 
        onlyOwner 
    {
        _addCommitment(commitment);
    }

}
