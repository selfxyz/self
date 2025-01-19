// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIdentityCommitmentRegistryV1 {
    function registerCommitment(bytes32 commitment, bytes32 attestationId, bytes32 nullifier) external;
    function checkRoot(bytes32 root) external view returns (bool);
    function getRootTimestamp(bytes32 root) external view returns (uint256);
    function getMerkleTreeSize() external view returns (uint256);
    function getMerkleRoot() external view returns (bytes32);
    function indexOf(bytes32 commitment) external view returns (uint256);
    function getCommitment(uint256 index) external view returns (bytes32);
    function getAllCommitments() external view returns (bytes32[] memory);
}
