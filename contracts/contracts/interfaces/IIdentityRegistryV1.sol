// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIdentityRegistryV1 {
    function registerCommitment(bytes32 attestationId, uint256 nullifier, uint256 commitment) external;
    function registerDscKeyCommitment(uint256 key) external;
    function rootTimestamps(uint256 root) external virtual view returns (uint256);
    function checkIdentityCommitmentRoot(uint256 root) external view returns (bool);
    function getIdentityCommitmentMerkleTreeSize() external view returns (uint256);
    function getIdentityCommitmentMerkleRoot() external view returns (uint256);
    function getIdentityCommitmentIndex(uint256 commitment) external view returns (uint256);
    function getDscKeyCommitmentMerkleRoot() external view returns (uint256);
    function checkDscKeyCommitmentMerkleRoot(uint256 root) external view returns (bool);
    function getOfacRoot() external view returns (uint256);
    function getCscaRoot() external view returns (uint256);
    function checkOfacRoot(uint256 root) external view returns (bool);
    function checkCscaRoot(uint256 root) external view returns (bool);
}
