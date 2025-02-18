// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PCR0Manager
 * @notice This contract manages a mapping of PCR0 values (provided as a 48-byte value)
 *         to booleans. The PCR0 value (the 48-byte SHA384 output) is hashed
 *         using keccak256 and then stored in the mapping.
 *         Only the owner can add or remove entries.
 */
contract PCR0Manager is Ownable {
    // Pass msg.sender directly to Ownable constructor
    constructor() Ownable(msg.sender) {}

    // Mapping from keccak256(pcr0) to its boolean state.
    mapping(bytes32 => bool) public pcr0Mapping;

    /// @notice Emitted when a PCR0 entry is added.
    /// @param key The keccak256 hash of the input PCR0 value.
    event PCR0Added(bytes32 indexed key);

    /// @notice Emitted when a PCR0 entry is removed.
    /// @param key The keccak256 hash of the input PCR0 value.
    event PCR0Removed(bytes32 indexed key);

    /**
     * @notice Adds a new PCR0 entry by setting its value to true.
     * @param pcr0 The PCR0 value (must be exactly 48 bytes).
     * @dev Reverts if the PCR0 value is not 48 bytes or if it is already set.
     */
    function addPCR0(bytes calldata pcr0) external onlyOwner {
        require(pcr0.length == 48, "PCR0 must be 48 bytes");
        bytes32 key = keccak256(pcr0);
        require(!pcr0Mapping[key], "PCR0 already set");
        pcr0Mapping[key] = true;
        emit PCR0Added(key);
    }

    /**
     * @notice Removes an existing PCR0 entry by setting its value to false.
     * @param pcr0 The PCR0 value (must be exactly 48 bytes).
     * @dev Reverts if the PCR0 value is not 48 bytes or if it is not currently set.
     */
    function removePCR0(bytes calldata pcr0) external onlyOwner {
        require(pcr0.length == 48, "PCR0 must be 48 bytes");
        bytes32 key = keccak256(pcr0);
        require(pcr0Mapping[key], "PCR0 not set");
        pcr0Mapping[key] = false;
        emit PCR0Removed(key);
    }

    /**
     * @notice Checks whether a given PCR0 value is set to true in the mapping.
     * @param pcr0 The PCR0 value (must be exactly 48 bytes).
     * @return exists True if the PCR0 entry is set, false otherwise.
     */
    function isPCR0Set(
        bytes calldata pcr0
    ) external view returns (bool exists) {
        require(pcr0.length == 48, "PCR0 must be 48 bytes");
        bytes32 key = keccak256(pcr0);
        return pcr0Mapping[key];
    }
}
