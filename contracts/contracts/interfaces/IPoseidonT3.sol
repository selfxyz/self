// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IPoseidonT3
 * @notice Interface for the PoseidonT3 library
 */
interface IPoseidonT3 {
    function hash(uint256[2] memory inputs) external pure returns (uint256);
}
