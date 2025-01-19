// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIdentityRegistryV1 {
    function registerCommitment(bytes32 attestationId, bytes32 nullifier, bytes32 commitment) external;
    function checkIdentityCommitmentRoot(bytes32 root) external view returns (bool);
    function getIdentityCommitmentRootTimestamp(bytes32 root) external view returns (uint256);
    function getIdentityCommitmentMerkleTreeSize() external view returns (uint256);
    function getIdentityCommitmentMerkleRoot() external view returns (bytes32);
    function getIdentityCommitmentIndex(bytes32 commitment) external view returns (uint256);
    function getIdentityCommitment(uint256 index) external view returns (bytes32);
    function getAllIdentityCommitments() external view returns (bytes32[] memory);
    function getOfacRoot() external view returns (bytes32);
    function getCscaRoot() external view returns (bytes32);
    function checkOfacRoot(bytes32 root) external view returns (bool);
    function checkCscaRoot(bytes32 root) external view returns (bool);
}
