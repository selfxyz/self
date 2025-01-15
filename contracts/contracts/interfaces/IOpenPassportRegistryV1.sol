// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IOpenPassportRegistryV1 {
    function registerCommitment(uint256 commitment) external;
    function checkRoot(uint256 root) external view returns (bool);
}