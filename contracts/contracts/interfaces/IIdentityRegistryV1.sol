// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIdentityRegistryV1 {
    function registerCommitment(uint256 attestationId, uint256 nullifier, uint256 commitment) external;
    function checkIdentityCommitmentRoot(uint256 root) external view returns (bool);
    function getIdentityCommitmentRootTimestamp(uint256 root) external view returns (uint256);
    function getIdentityCommitmentMerkleTreeSize() external view returns (uint256);
    function getIdentityCommitmentMerkleRoot() external view returns (uint256);
    function getIdentityCommitmentIndex(uint256 commitment) external view returns (uint256);
    function getIdentityCommitment(uint256 index) external view returns (uint256);
    function getAllIdentityCommitments() external view returns (uint256[] memory);
    function getOfacRoot() external view returns (uint256);
    function getCscaRoot() external view returns (uint256);
    function checkOfacRoot(uint256 root) external view returns (bool);
    function checkCscaRoot(uint256 root) external view returns (bool);
}
