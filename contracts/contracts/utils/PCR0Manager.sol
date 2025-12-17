// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PCR0Manager
 * @notice This contract manages a mapping of PCR0 values (provided as a 48-byte value)
 *         to booleans. The PCR0 value (the 48-byte SHA384 output) is hashed
 *         using keccak256 and then stored in the mapping.
 *         Only accounts with SECURITY_ROLE can add or remove entries.
 * @custom:version 1.2.0
 */
contract PCR0Manager is AccessControl {
    /// @notice Critical operations and role management requiring 3/5 multisig consensus
    bytes32 public constant SECURITY_ROLE = keccak256("SECURITY_ROLE");

    /// @notice Standard operations requiring 2/5 multisig consensus
    bytes32 public constant OPERATIONS_ROLE = keccak256("OPERATIONS_ROLE");

    constructor() {
        // Grant all roles to deployer initially
        _grantRole(SECURITY_ROLE, msg.sender);
        _grantRole(OPERATIONS_ROLE, msg.sender);

        // Set role admins - SECURITY_ROLE is admin of both roles
        _setRoleAdmin(SECURITY_ROLE, SECURITY_ROLE);
        _setRoleAdmin(OPERATIONS_ROLE, SECURITY_ROLE);
    }

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
     * @param pcr0 The PCR0 value (must be exactly 32 bytes).
     * @dev Reverts if the PCR0 value is not 32 bytes or if it is already set.
     * @dev Pads the PCR0 value to 48 bytes by prefixing 16 zero bytes to maintain mobile app compatibility.
     */
    function addPCR0(bytes calldata pcr0) external onlyRole(SECURITY_ROLE) {
        require(pcr0.length == 32, "PCR0 must be 32 bytes");
        bytes memory paddedPcr0 = abi.encodePacked(new bytes(16), pcr0);
        bytes32 key = keccak256(paddedPcr0);
        require(!pcr0Mapping[key], "PCR0 already set");
        pcr0Mapping[key] = true;
        emit PCR0Added(key);
    }

    /**
     * @notice Removes an existing PCR0 entry by setting its value to false.
     * @param pcr0 The PCR0 value (must be exactly 32 bytes).
     * @dev Reverts if the PCR0 value is not 32 bytes or if it is not currently set.
     * @dev Pads the PCR0 value to 48 bytes by prefixing 16 zero bytes to maintain mobile app compatibility.
     */
    function removePCR0(bytes calldata pcr0) external onlyRole(SECURITY_ROLE) {
        require(pcr0.length == 32, "PCR0 must be 32 bytes");
        bytes memory paddedPcr0 = abi.encodePacked(new bytes(16), pcr0);
        bytes32 key = keccak256(paddedPcr0);
        require(pcr0Mapping[key], "PCR0 not set");
        pcr0Mapping[key] = false;
        emit PCR0Removed(key);
    }

    /**
     * @notice Checks whether a given PCR0 value is set to true in the mapping.
     * @param pcr0 The PCR0 value (must be exactly 48 bytes).
     * @dev Does not pad the PCR0 value as this is handled by the mobile app.
     * @dev If you are manually calling this function, you need to pad the PCR0 value to 48 bytes, prefixing 16 zero bytes.
     * @return exists True if the PCR0 entry is set, false otherwise.
     */
    function isPCR0Set(bytes calldata pcr0) external view returns (bool exists) {
        require(pcr0.length == 48, "PCR0 must be 48 bytes");
        bytes32 key = keccak256(pcr0);
        return pcr0Mapping[key];
    }
}
